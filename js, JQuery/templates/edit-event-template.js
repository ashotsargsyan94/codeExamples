export default function editEventTemplate(event) {
event.local_start_date = moment.utc(event.start_date).local().format('YYYY-MM-DD HH:mm:ss');
event.local_end_date = moment.utc(event.end_date).local().format('YYYY-MM-DD HH:mm:ss');

    return /* template */`
<div class="popup"
     data-popup="edit-event">
    <div class="tableDv">
        <div class="tableCell">
            <div class="contain">
                <div class="_inner">

                    <div class="header">
                        <div class="circle"></div>
                        <img src="${urlFrom('assets/images/site_icon/icon-calendar.svg')}">
                        <h2>${translate('Edit Event')}</h2>
                    </div>

                    <ul class="nav nav-tabs nav-justified"
                        role="tablist">
                        <li id="event-description-tab"
                            role="presentation"
                            class="active">
                            <a href="#event-description"
                               aria-controls="event-description"
                               role="tab"
                               data-toggle="tab">
                               ${translate('Description')}
                            </a>
                        </li>
                        <li id="event-invitees-tab"
                            role="presentation">
                            <a href="#event-invitees"
                               aria-controls="event-invitees"
                               role="tab"
                               data-toggle="tab">
                               ${translate('Invitees')}
                            </a>
                        </li>
                    </ul>

                    <div class="tab-content scrollbar">
                        <div role="tabpanel"
                             class="tab-pane fade in active"
                             id="event-description">

                            <form id="description-form">

                                <div class="formRow row">
                                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                        <h4>${translate('Name')}</h4>
                                        <input type="text"
                                               name="title"
                                               class="txtBox
                                               placeholder="${translate('Event Name')}"
                                               value="${event.title}"
                                               required />
                                    </div>

                                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp media-upload">
                                        <div class="appLoad hidden">
                                            <div class="appLoader">
                                                <span class="spiner"></span>
                                            </div>
                                        </div>

                                        <button type="button"
                                                class="webBtn addEventPhotoVideo">
                                                ${translate('Upload Photo/Video')}
                                        </button>
                                        <button type="button"
                                                class="webBtn removeMedia hidden">
                                                ${translate('Delete Photo/Video')}
                                        </button>
                                    </div>
                                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp ${(!empty(event.video_conference_id)) && 'hide'}" id="vc_link_button">
                                        <button type="button"
                                                class="webBtn videoConferenceBtn">
                                                ${translate('Video Conference')}
                                        </button>
                                    </div>
                                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp  ${(empty(event.video_conference_id)) && 'hide'}" id="vc_link_section">
                                        <h4>${translate('Video Conference Link')}</h4>
                                        <div>
                                            <a class="vc_link" href="video-conferences/${event.video_conference_id}">${translate('Video Conference Link')}</a>
                                            <i class="fas fa-minus-circle clear_vc_link" style="cursor: pointer"></i>
                                        </div>
                                        <input type="hidden" value="${event.video_conference_link}" name="videoConferenceLink" />
                                    </div>

                                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                        <h4>${translate('Date')}</h4>
                                        <input type="hidden" value="${event.local_start_date}" class="event_datepicker" name="start_date" />
                                        <input type="hidden" value="${event.local_end_date}" class="event_datepicker" name="end_date" />

                                        <div id="vue_datetime">
                                            <div class="formRow row">
                                                        <div class="col-lg-6 col-12 col-md-6 col-sm-6 col-xs-12 datetime-wrapper txtGrp">
                                                            <datetime
                                                                    v-model="start_date"
                                                                    placeholder="${translate('From Date')}"
                                                                    type="datetime"
                                                                    format="LL/dd/yyyy hh:mm a"
                                                                    use12-hour
                                                                    input-class="txtBox"
                                                                    :min-datetime="min_date"
                                                                    @input="updatedStartDateEvent"
                                                                    required="required"
                                                                ></datetime>
                                                            <i class="fas fa-calendar"
                                                            aria-hidden="true"></i>
                                                        </div>

                                                        <div class="col-lg-6 col-12 col-md-6 col-sm-6 col-xs-12 datetime-wrapper txtGrp">
                                                            <datetime
                                                                    v-model="end_date"
                                                                    placeholder="${translate('To Date')}"
                                                                    type="datetime"
                                                                    :min-datetime="min_end_date"
                                                                    format="LL/dd/yyyy hh:mm a"
                                                                    use12-hour
                                                                    input-class="txtBox"
                                                                    required="required"
                                                                    @input="updatedEndDateEvent"
                                                                ></datetime>
                                                            <i class="fas fa-calendar"
                                                            aria-hidden="true"></i>
                                                        </div>
                                                    </div>
                                        </div>
                                    </div>

                                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                        <h4>${translate('Location')}
                                            <!--<a id="more"> ${translate('...More')}</a>-->
                                        </h4>
                                        <textarea name="address"
                                                  class="txtBox"
                                                  placeholder="${translate('address, city, state, zip, country')}"
                                                  rows="3"
                                                  required>${event.address}</textarea>
                                    </div>

                                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                        <h4>${translate('Description')}</h4>
                                        <textarea name="detail"
                                                  class="txtBox"
                                                  placeholder="${translate('Talk a little about the event...')}"
                                                  required>${event.detail.replaceAll('<br />', '').replaceAll('&nbsp;', ' ')}</textarea>
                                    </div>
                                </div>

                                <input class="eventPhotoVideoInput"
                                       type="file"
                                       accept=".jpg,.jpeg,.png,.mp4,.mov,qt,.avi,.mpg,.m3u8"
                                       style="display: none;" />
                            </form>
                        </div>

                        <div role="tabpanel"
                             class="tab-pane fade"
                             id="event-invitees">
                            <div class="public-wrapper">
                                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                    <div class="formRow row public-row">
                                        <label for="public">${translate('Public')}</label>
                                        <div class="round"> <input id="publicInput" type="checkbox"/><label for="publicInput"></label></div>
                                    </div>
                                </div>
                            </div>
                            <div class="invitees-wrapper">
                                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                    <div class="formRow row search-row">
                                        <label for="search-input">
                                            <i class="fas fa-search"
                                               aria-hidden="true">
                                            </i>
                                        </label>

                                        <input id="search-input"
                                               type="text"
                                               class="txtBox"
                                               placeholder="${translate('Search')}"
                                               data-search="searchUsers" />

                                        <a id="search-clear"
                                           class="fas fa-times-circle hidden"
                                           aria-hidden="true">
                                        </a>
                                    </div>
                                </div>

                                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 scrollbar">
                                    <ul class="invitees-list">

                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form id="editEventForm"
                          action="events/edit"
                          method="post">
                        <input type="hidden"
                               name="id"
                               value="${event.id}" />

                        <button type="submit"
                                class="webBtn submit-event">
                                ${translate('Update')}
                            <i class="spinner hidden"></i>
                        </button>
                        <button type="button"
                                class="webBtn cancel-event">
                                ${translate('Cancel')}
                        </button>
                        <button type="button"
                                class="webBtn delete-event">
                            <i class="fas fa-lg fa-trash"></i>
                        </button>

                        <div class="alertMsg"
                             style="display:none">
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>


`;
}