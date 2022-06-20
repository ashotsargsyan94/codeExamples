<?php
namespace App\Services\JsonModel;

use Illuminate\Support\Facades\Storage;

abstract class AbstractModel {

    private static $objects = [];

    protected $auto_increment;

    protected $data = [];

    private static function getStorageDisk(){
        return Storage::disk('json_data');
    }

    /**
     * UserController constructor.
     * @throws \Exception
     */
    protected function __construct()
    {
        if (!isset($this->filename)) throw new \Exception('No file name defined.');
        if (!isset($this->attributes)) throw new \Exception('No attributes defined.');
        $this->parseJson();
    }

    /**
     * @throws \Illuminate\Contracts\Filesystem\FileNotFoundException
     * @throws \Exception
     */
    private function parseJson(){
        $disk = self::getStorageDisk();
        if ($disk->exists($this->filename)){
            $file_contents = $disk->get($this->filename);
            $content = json_decode($file_contents, true);
            if (!$content) $content = [];
        }
        else $content = [];
        $this->data = collect($content['data']??[]);
        $auto_increment = $content['auto_increment']??1;
        $max_id = (int) $this->data->max('id');
        if ($max_id>$auto_increment) $auto_increment = $max_id;
        $this->auto_increment = $auto_increment;
        return ;
    }

    public static function make() {
        $model = get_called_class();
        if (array_key_exists($model, self::$objects)) return self::$objects[$model];
        $object = new $model();
        self::$objects[$model] = $object;
        return $object;
    }

    public function get() {
        return $this->data;
    }

    public function insert(array $data){
        $id = $this->auto_increment++;
        $model = [
            'id' => $id,
        ];
        foreach($this->attributes as $attribute) {
            $model[$attribute] = $data[$attribute]??null;
        }
        $this->data->push($model);
        $this->putContents();
        return $id;
    }

    /**
     * @param int $id
     * @param array $data
     * @return bool
     * @throws \Exception
     */
    public function update(int $id, array $data){
        $row = $this->get()->where('id', $id);
        $model = $row->first();
        if ($model===null) throw new \Exception('Model not found.');
        foreach ($data as $key=>$attribute) {
            if (array_key_exists($key, $model) && $key!='id') {
                $model[$key] = $attribute;
            }
        }
        $key = $row->keys()[0];
        $this->data[$key] = $model;
        $this->putContents();
        return true;
    }

    /**
     * @param int $id
     * @throws \Exception
     */
    public function delete(int $id) {
        $newData = $this->data->reject(function($item) use ($id){
            return $item['id'] == $id;
        });
        if (count($newData) == count($this->data)) throw new \Exception('Model not found.');
        $this->data = $newData->values();
        $this->putContents();
    }

    public function flush(){
        $this->data = collect();
        $this->auto_increment = 1;
        $this->putContents();
    }

    private function putContents(){
        $content = [
            'auto_increment' => $this->auto_increment,
            'data' => $this->data->toArray(),
        ];
        $disk = self::getStorageDisk();
        $disk->put($this->filename, json_encode($content, JSON_UNESCAPED_UNICODE));
    }

    public function getWithRelations(){
        $collection = $this->get();
        if (!isset($this->relations)) return $collection;
        foreach ($this->relations as $relation_key => $relation) {
            $model = $relation['model']::make()->get();
            foreach ($collection as $key=>$item) {
                $find = $model->where('id', $item[$relation['key']])->first();
                $item[$relation_key] = $find;
                $collection[$key] = $item;
            }
        }
        return $collection;
    }
}