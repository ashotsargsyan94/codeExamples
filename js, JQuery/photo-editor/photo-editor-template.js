
export default function photoEditorTemplate() {
    return /* template */`
        <section id="photo-editor" class="popup crpr_popup" data-popup="cropper">
            <div class="inside">
                <div class="_inner">
                    <div id="close-cropper" class="crosBtn"></div>
                    <div class="image-container">
                        <h3></h3>
                        <canvas id="image-canvas" src="" alt="Picture" data-caman-hidpi-disabled="true"/>
                        <div class="appLoad hidden">
                            <div class="appLoader">
                                <span class="spiner"></span>
                            </div>
                        </div>                    
                    </div>
                    <div class="tab-content">
                        <div id="filterTab" class="tab-pane fade active in">
                            <div id="filterSlider" class="owl-carousel owl-theme text-center">
                                <button class="inner">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Normal</small>
                                </button>
                                <button class="inner" data-preset="clarity">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Clarity</small>
                                </button>
                                <button class="inner" data-preset="vintage">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Vintage</small>
                                </button>
                                <button class="inner" data-preset="lomo">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Lomo</small>
                                </button>
                                <button class="inner" data-preset="sunrise">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Sunrise</small>
                                </button>
                                <button class="inner" data-preset="crossProcess">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Cross Process</small>
                                </button>
                                <button class="inner" data-preset="orangePeel">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Orange Peel</small>
                                </button>
                                <button class="inner" data-preset="love">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Love</small>
                                </button>
                                <button class="inner" data-preset="grungy">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Grungy</small>
                                </button>
                                <button class="inner" data-preset="jarques">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Jarques</small>
                                </button>
                                <button class="inner" data-preset="pinhole">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Pinhole</small>
                                </button>
                                <button class="inner" data-preset="oldBoot">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Old Boot</small>
                                </button>
                                <button class="inner" data-preset="glowingSun">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Glowing Sun</small>
                                </button>
                                <button class="inner" data-preset="hazyDays">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Hazy Days</small>
                                </button>
                                <button class="inner" data-preset="herMajesty">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Her Majesty</small>
                                </button>
                                <button class="inner" data-preset="nostalgia">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Nostalgia</small>
                                </button>
                                <button class="inner" data-preset="hemingway">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Hemingway</small>
                                </button>
                                <button class="inner" data-preset="concentrate">
                                    <div class="ico">
                                        <canvas class="caman-filter" alt="filter"></canvas>
                                    </div>
                                    <small>Concentrate</small>
                                </button>
                            </div>
                        </div>
                        
                        <div id="brightnessTab" class="tab-pane fade">
                            <div class="crprBtns text-center">  
<!--                                <button type="button" class="ncrp-btn" title="Brightness"><i class="far fa-sun"></i></button>-->
                                <div class="light_btns_group">
                                <button type="button" class="ncrp-btn update_light_btn" data-type="brightness" data-option="5" title="Brightness Increase"><i class="fas fa-plus"></i></button>
                                <button type="button" class="ncrp-btn update_light_btn" data-type="brightness" data-option="-5" title="Brightness Decrease"><i class="fas fa-minus"></i></button>
                                <small>Brightness</small>
                                </div>
                                
<!--                                <button type="button" class="ncrp-btn" title="Contrast"><i class="fas fa-adjust"></i></button>-->
                                <div class="light_btns_group">
                                <button type="button" class="ncrp-btn update_light_btn" data-type="contrast" data-option="5" title="Contrast Increase"><i class="fas fa-plus"></i></button>
                                <button type="button" class="ncrp-btn update_light_btn" data-type="contrast" data-option="-5" title="Contrast Decrease"><i class="fas fa-minus"></i></button>                                
                                <small>Contrast</small>
                                </div>
                            </div>
                        </div>
                        <div id="cropTab" class="tab-pane fade">
                            <div class="crprBtns text-center">
                                <button type="button" class="ncrp-btn" data-method="crop" title="Crop"><i class="fas fa-crop"></i></button>
                                <button type="button" class="ncrp-btn" data-method="rotate" data-option="-90" title="Rotate Left"><i class="fas fa-undo"></i></button>
                                <button type="button" class="ncrp-btn" data-method="rotate" data-option="90" title="Rotate Right"><i class="fas fa-undo fa-flip-horizontal"></i></button>
                                <button type="button" class="ncrp-btn" data-method="scaleX" data-option="-1" title="Flip Horizontal"><i class="fas fa-arrows-alt-h"></i></button>
                                <button type="button" class="ncrp-btn" data-method="scaleY" data-option="-1" title="Flip Vertical"><i class="fas fa-arrows-alt-v"></i></button>
                                <button type="button" class="crp-btn hidden" data-method="zoom" data-option="0.1" title="Zoom In"><i class="fas fa-search-plus"></i></button>
                                <button type="button" class="crp-btn hidden" data-method="zoom" data-option="-0.1" title="Zoom Out"><i class="fas fa-search-minus"></i></button>
                                <button type="button" class="crp-btn hidden" data-method="clear" title="Clear"><i class="fas fa-times"></i></button>
                                <button type="button" class="" data-method="reset" title="Reset"><i class="fas fa-times"></i></button>
                            </div>
                        </div>

                    </div>
                    <ul class="nav nav-tabs flex">
                        <li class="active"><a data-toggle="tab" href="#filterTab"><i class="fi-grid"></i></a></li>
                        <li><a data-toggle="tab" href="#brightnessTab"><i class="far fa-sun"></i></a></li>
                        <li><a data-toggle="tab" href="#cropTab"><i class="fi-pencil"></i></a></li>
                        <li><button type="button" data-method="getCroppedCanvas">Done</button></li>
                    </ul>
                </div>
            </div>
        </section>
    `
}
