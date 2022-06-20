import '../cropper/cropper.js';
import '../camanjs/caman.full.pack.js';
import '../js/third-party/owl.carousel.min.js';

import photoEditorTemplate from './photo-editor-template.js';
import { isImageFile } from '../js/file-input-helpers.js';

/**
 * Edit photo using CropperJS library & CamanJS (for filters, manipulations, etc.);
 *
 * When setting maxWidth or maxHeight, keep in mind that a larger image will take longer
 * to render with filters, etc.
 * @param {File} file - File from HTML input
 * @param {*} maxWidth - maximum width this image should be scaled to
 * @param {*} maxHeight - maximum height this image should be scaled to
 * @param {*} processedCount - hove many images was processed. used for multiple select
 * @returns A promise that resolves to an image blob or null
 */
export default function editPhoto(file, maxWidth = 2400, maxHeight = 2400, processedCount = false, includeEditor = true) {
    return new Promise( async(resolve, reject) => {
        if (!isImageFile(file)) return reject('Not an image file');

        // show preloder to prevent any other user action
        showPreloader();

        const $template = injectPhotoEditorTemplate();
        const $canvas = $('#image-canvas');
        const $imageCount = $template.find('.image-container h3');

        // show count if selected more than one
        if (processedCount) {
            $imageCount.html('');
            $imageCount.html(processedCount);
        }

        const URL = window.URL || window.webkitURL;
        let imageURL = URL.createObjectURL(file);

        let img = new Image();
        img.src = imageURL;

        img.onload = async () => {
            // there is canvas dimension limit of 4096 on iOS
            if ((isIOSDevice() && (img.height > 4096 || img.width > 4096)) || file.type === 'image/gif') {
                return await fetch(imageURL)
                    .then(function(response) {
                        hidePreLoader();
                        return resolve(response.blob());
                    });
            }

            imageURL = await resizeImage(imageURL, maxWidth, maxHeight);

            let cropper;
            // Initialize CamanJS & CropperJS plugin
            const caman = Caman($canvas[0], imageURL, () => {
                cropper = $canvas.cropper({
                    viewMode: 2,
                    autoCrop: false,
                    dragMode: 'none',
                    movable: false,
                    background: false,
                    // Workaround to fix the margin not working correctly once zooming in
                    // So after zooming for the first time remove the margin
                    zoom: function () {
                        if (! $template.find('.cropper-canvas').hasClass('zoomed')) {
                            $template.find('.cropper-canvas').addClass('zoomed');
                        }
                    }
                }).data('cropper');

                initializeCamanFilters(imageURL, caman, cropper).then(() => {
                    $template.find('.image-container').css('height', $('.cropper-canvas').css('height'));
                    $('.cropper-canvas').css('transform', 'unset');

                    // hide preloder
                    hidePreLoader()

                    if (! includeEditor) {
                        return save();
                    }

                    $template.css('visibility', 'visible');
                });
            });

            function cancel() {
                URL.revokeObjectURL(imageURL);
                removePhotoEditorTemplate();
                return resolve(null);
            }

            // Cancel editing when click the X button
            $('#close-cropper').click(cancel);

            $template.find('button[data-method]').click(function () {
                const $this = $(this);
                const data = {...$this.data()};

                if ($this.prop('disabled') || $this.hasClass('disabled')) {
                    return;
                }

                switch (data.method) {
                    case 'crop':
                        $template.find('.crprBtns .crp-btn').removeClass('hidden');
                        $template.find('.crprBtns .ncrp-btn').addClass('hidden');
                        $template.find('.cropper-canvas').removeClass('zoomed');
                        break;

                    case 'clear':
                        $template.find('.crprBtns .crp-btn').addClass('hidden');
                        $template.find('.crprBtns .ncrp-btn').removeClass('hidden');
                        break;

                    case 'scaleX':
                    case 'scaleY':
                        $this.data('option', -data.option);
                        break;

                    case 'getCroppedCanvas':
                        // Only allow button to be pressed once
                        $this.prop('disabled', true);
                        save();
                        break;

                    case 'destroy':
                        cancel();
                        break;

                    default:
                        break;
                }

                // Perform the cropper actions
                $canvas.cropper(data.method, data.option);
                $('.cropper-canvas').css('transform', 'unset');
            });

            $template.find('.update_light_btn').on('click', function () {
                let type = $(this).data('type');
                let option = $(this).data('option');
                update_light(type, option, caman, cropper);
            });
        }

        function save() {
            const fillColor = file.type === 'image/jpeg' ? '#fff' : 'transparent';
            const canvas = $canvas.cropper('getCroppedCanvas', {
                maxWidth: 4096,
                maxHeight: 4096,
                fillColor,
                imageSmoothingEnabled: false,
                imageSmoothingQuality: 'high',
            });

            canvas.toBlob((blob) => {
                removePhotoEditorTemplate();
                URL.revokeObjectURL(imageURL);

                return resolve(blob);
            }, file.type, 1);
        }
    });
}

/**
 * preloader whihc used after photo selected for editing
 * to prevent any other user action
 */
function showPreloader() {
    $('body').append('<div id="preloader"><div class="loader"></div></div>');
}

/**
 * close preloader
 */
function hidePreLoader() {
    $('#preloader').remove();
}

function injectPhotoEditorTemplate() {
    let $template = $('#photo-editor');
    if ($template.length) {
        $template.remove();
    }
    $template = $(photoEditorTemplate()).appendTo('body');

    $('body').addClass('flow');

    return $template;
}

function removePhotoEditorTemplate() {
    const $template = $('#photo-editor');
    if ($template.length) {
        $template.fadeOut(() => {
            $template.remove();
        });
        $('body').removeClass('flow');
    }
}

function initFilterSlider() {
    $('#filterSlider').owlCarousel({
        dots: false,
        margin: 10,
        autoWidth: true,
        items: 6,
    });
}

function applyFilter(event, caman, cropper) {
    const $el = $(event.target);
    const preset = $el.parents('button').data('preset');
    if (preset) {
        // undo last filter without rendering
        // to prevent flickering to normal before new filter is applied
        $('#photo-editor .appLoad').removeClass('hidden');
        $('#photo-editor .cropper-canvas').addClass('loading');
        caman.revert(false);
        caman[preset]().render(function() {
            cropper.replace(caman.toBase64(), true);
            $('#photo-editor .appLoad').addClass('hidden');
            $('#photo-editor .cropper-canvas').removeClass('loading');

        });
    } else {
        // revert image to normal
        caman.revert();
        cropper.replace(caman.toBase64(), true);
    }
}

function update_light(type, option, caman, cropper) {
    caman[type](option);
    caman.render(function() {
        cropper.replace(caman.toBase64(), true);
    });
}

function initializeCamanFilters(imageURL, caman, cropper) {
    initFilterSlider();
    return new Promise(async(resolve) => {
        let thumbnailURL = await resizeImage(imageURL, 60, 60);
        const renderFilters = $('#filterSlider .caman-filter').map(function (_, el) {
            return new Promise((resolveFilter) => {
                el.src = thumbnailURL;
                const preset = $(el).parents('button').data('preset');
                // Add filter to thumbnail preview
                Caman(el, thumbnailURL, function() {
                    if (preset) {
                        this[preset]().render(() => resolveFilter());
                    } else {
                        resolveFilter();
                    }
                });

                $(el).click(e => {
                    applyFilter(e, caman, cropper);
                });
            });
        }).get();
        // Render all the filter thumbnails and then resolve
        Promise.all(renderFilters).then(() => resolve());
    });
}

/**
 * Resize an image on the browser using canvas & preserve aspect ratio
 * https://stackoverflow.com/a/53986239/2926151
 * @param {string} base64image
 * @param {number} width
 * @param {number} height
 */
function resizeImage(base64image, width = 1024, height = 1024) {
    return new Promise(resolve => {
        let img = new Image();
        img.src = base64image;

        img.onload = () => {
            // Check if the image require resize at all
            if (img.height <= height && img.width <= width) {
                resolve(base64image);
            }
            else {
                // Make sure the width and height preserve the original aspect ratio and adjust if needed
                if (img.height > img.width) {
                    width = Math.floor(height * (img.width / img.height));
                }
                else {
                    height = Math.floor(width * (img.height / img.width));
                }

                let resizingCanvas = document.createElement('canvas');
                let resizingCanvasContext = resizingCanvas.getContext("2d");

                // Start with original image size
                resizingCanvas.width = img.width;
                resizingCanvas.height = img.height;

                // Draw the original image on the (temp) resizing canvas
                resizingCanvasContext.drawImage(img, 0, 0, resizingCanvas.width, resizingCanvas.height);

                let curImageDimensions = {
                    width: Math.floor(img.width),
                    height: Math.floor(img.height)
                };

                let halfImageDimensions = {
                    width: null,
                    height: null
                };

                // Quickly reduce the size by 50% each time in few iterations until the size is less then
                // 2x time the target size - the motivation for it, is to reduce the aliasing that would have been
                // created with direct reduction of very big image to small image
                while (curImageDimensions.width * 0.5 > width) {
                    // Reduce the resizing canvas by half and refresh the image
                    halfImageDimensions.width = Math.floor(curImageDimensions.width * 0.5);
                    halfImageDimensions.height = Math.floor(curImageDimensions.height * 0.5);

                    resizingCanvasContext.drawImage(resizingCanvas, 0, 0, curImageDimensions.width, curImageDimensions.height,
                        0, 0, halfImageDimensions.width, halfImageDimensions.height);

                    curImageDimensions.width = halfImageDimensions.width;
                    curImageDimensions.height = halfImageDimensions.height;
                }

                // Now do final resize for the resizingCanvas to meet the dimension requirments
                // directly to the output canvas, that will output the final image
                let outputCanvas = document.createElement('canvas');
                let outputCanvasContext = outputCanvas.getContext("2d");

                outputCanvas.width = width;
                outputCanvas.height = height;

                outputCanvasContext.drawImage(resizingCanvas, 0, 0, curImageDimensions.width, curImageDimensions.height,
                    0, 0, width, height);

                // output the canvas pixels as an image. params: format, quality
                resolve(outputCanvas.toDataURL('image/jpeg', 0.85));

                resizingCanvas.remove();
                outputCanvas.remove();
            }
        };
    });
}
