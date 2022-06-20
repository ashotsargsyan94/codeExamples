<?php

namespace App\Http\Controllers;

use App\Helpers\CommonHelper;
use App\Helpers\EncryptionLikeCIClass;
use App\Jobs\StorePost;
use App\Models\Community;
use App\Models\CommunityContent;
use App\Models\Form;
use App\Models\Message;
use App\Models\Post;
use App\Services\Uploader;
use Carbon\Carbon;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Contracts\View\Factory;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class PostsController extends Controller
{
    private $uploader;

    function __construct()
    {
        $this->uploader = new Uploader();
    }

    /**
     * Display a listing of the resource.
     *
     * @return Application|Factory|Response|View
     */
    public function index()
    {
        $community_id = Cookie::get('community_id');
        $posts = Post::allowedOnly()->with('member', 'attachments')->orderBy('created_at')->paginate(15);

        $encryptionLikeCIClass = new \App\Helpers\EncryptionLikeCIClass(['key' => env('ENCRYPTION_KEY')]);
        foreach ($posts as $key => $post) {
            $posts[$key]->body = Str::words($encryptionLikeCIClass->decrypt($post->body), 10, '...');
        }

        return view('posts.index', compact(['posts', 'community_id']));
    }

    public function create()
    {
        $community = Community::find(Cookie::get('community_id'));

        if (! $community) {
            return redirect('/');
        }

        $community->load([
            'channels' => fn($query) => $query->where('type', 'Core'),
        ]);

        return view('posts.create', compact('community'));
    }

    /**
     * Display the specified resource.
     */
    public function show(Message $post)
    {
        $encryptionLikeCIClass = new EncryptionLikeCIClass([
            'key' => env('ENCRYPTION_KEY')
        ]);

        return view('posts.show', compact(['post', 'encryptionLikeCIClass']));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit()
    {
        // TODO ?
    }

    /**
     * Update the specified resource in storage.
     */
    public function update()
    {
        // TODO ?
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Message $post)
    {
        try {
            $post->delete();

            $message = 'Post deleted successfully.';
            $status = 'success';
            $code = 200;
        } catch (\Throwable $e) {
            $message = getenv('APP_ENV') !== 'production' ? $e->getMessage() : 'An error has occurred.';
            $status = 'error';
            $code = 400;
        }

        if ($request->ajax()) {
            return response()->json([
                'status'  => $status,
                'message' => $message,
            ], $code);
        }

        return redirect()->route('comments.index')->with($status, $message);
    }

    /**
     * Show reported comments.
     */
    public function reportedShow()
    {
        $community_id = Cookie::get('community_id');

        $reported = Post::allowedCommunityMessages()
            ->has('reports')
            ->with('reports', 'member', 'attachments', 'reports.member')
            ->paginate(15);

        $encryptionLikeCIClass = new EncryptionLikeCIClass(['key' => env('ENCRYPTION_KEY')]);

        foreach ($reported as $key => $post) {
            $reported[$key]->body = Str::words($encryptionLikeCIClass->decrypt($post->body), 10, '...');
        }

        return view('posts.reported', compact(['reported', 'community_id']));
    }

    private function processUrls(string $content): string
    {
        $pattern = '/(http|https|ftp|ftps)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(\/\S*)?/i';
        $replace = '<a href="${0}" target="_blank">${0}</a>';

        return preg_replace($pattern, $replace, $content);
    }

    public function store()
    {
        $validatedData = request()->validate([
            'schedule_date'   => 'required_if:should_schedule,true',
            'channel_ids'     => 'required',
            'formId'          => 'sometimes',
            'body'            => Rule::requiredIf(! request('attachments') && ! request('attachmentFiles')),
            'attachments'     => Rule::requiredIf(! request('body') && ! request('attachmentFiles')),
            'attachmentFiles' => Rule::requiredIf(! request('body') && ! request('attachments')),
        ]);

        $body = $validatedData['body'] ? $this->processUrls($validatedData['body']) : '';

        foreach ($validatedData['channel_ids'] as $channelId) {
            $data['creator_id'] = auth()->user()->id;
            $data['channel_id'] = $channelId;
            $data['body']       = CommonHelper::encrypt($body);

            $post = Post::create($data);

            if (request()->has('formId')) {
                if ($form = Form::find($validatedData['formId'])) {
                    $post->attachments()->create([
                        'url' => getenv('SQUIRREL_APP_BASE_URL') . $form->community_id . '#forms/' . $form->slug,
                        'url_title' => $form->name,
                        'url_description' => strip_tags($form->intro),
                        'url_image' => getenv('SQUIRREL_APP_BASE_URL') . 'assets/images/survey.jpeg',
                        'type' => 'form',
                        'file' => $form->slug
                    ]);
                }
            }

            if (request()->has('mask')) {
                CommunityContent::create([
                    'content_type' => 'comment',
                    'content_id'   => $post->id,
                ]);
            }

            foreach ($validatedData['attachments'] ?? [] as $fileName) {
                $post->attachments()->create([
                    'file' => $fileName,
                    'type' => pathinfo($fileName)['extension']
                ]);
            }

            foreach ($validatedData['attachmentFiles'] ?? [] as $fileName) {
                $post->attachments()->create([
                    'file' => $fileName,
                    'type' => 'download'
                ]);
            }

            if (request('should_schedule') === 'true') {
                $availableAt = Carbon::createFromFormat('Y/m/d H:i', $validatedData['schedule_date'], request('timezone'));

                $post->hidden = true;
                $post->created_at = $availableAt;
                $post->updated_at = $availableAt;
                $post->save();

                StorePost::dispatch($post)->delay($availableAt);
            } else {
                StorePost::dispatchNow($post);
            }
        }

        if (request()->has('formId')) {
            return redirect()->route('forms.index')->with('success', 'Form posted successfully');
        }

        return redirect()->route('posts.create');
    }

    public function generateSignedUrl()
    {
        $data = $this->uploader->generateMemberSignedUrl(
            Cookie::get('community_id'),
            pathinfo(request()->input('fileName'))['extension']
        );

        return response()->json($data);
    }

    public function uploadImage()
    {
        $result = $this->uploader->uploadImage(request()->file('file'), Cookie::get('community_id'));
        return response()->json($result);
    }

    public function uploadVideo()
    {
        $result = $this->uploader->uploadVideo(request()->file('file'), Cookie::get('community_id'));
        return response()->json($result);
    }

    public function uploadAttachment()
    {
        $result = $this->uploader->uploadFile(request()->file('file'), Cookie::get('community_id'));
        return response()->json($result);
    }

    public function extractVideoThumbnail()
    {
        $videoFileName = request('videoFileName');
        $thumbFileName = request('thumbFileName');

        if (! file_exists($videoFileName)) {
            $videoFileName = $this->uploader->path(Cookie::get('community_id')) . DIRECTORY_SEPARATOR . $videoFileName;
        }

        if (! file_exists($videoFileName)) {
            return false;
        }

        if (! $thumbFileName) {
            $pathInfo = pathinfo($videoFileName);
            $thumbFileName = $pathInfo['dirname'] . DIRECTORY_SEPARATOR . $pathInfo['filename'] . '.jpg';
        }

        exec(
            "ffmpeg -i {$videoFileName} -ss 00:00:01.000 -vframes 1 {$thumbFileName} 2>&1",
            $output,
            $return_var
        );

        if ($return_var == 0) {
            return $thumbFileName;
        }
    }
}
