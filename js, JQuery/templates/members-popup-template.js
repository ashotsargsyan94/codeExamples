export default function membersPopupTemplate(popupData) {

    let $notGoingTab = '';
    let $notGoingTabContent = '';

    if (popupData.length > 1) {
        $notGoingTab = `<li><a data-toggle="tab" href="#notGoingSect">${ popupData[1].title } <u>(${ popupData[1].count })</u></a></li>`;
        $notGoingTabContent = `
            <div id="notGoingSect" class="tab-pane fade in">
                <ul class="who_People">${ popupData[1].list }</ul>
            </div>
        `;
    }

    return /* template */`
    <div class="popup small-popup" data-popup="viewer">
        <div class="tableDv">
            <div class="tableCell">
                <div class="contain">
                    <div class="_inner">
                        <div class="crosBtn"></div>
                        <ul class="nav-tabs nav events-viewer-top">
                            <li class="active"><a data-toggle="tab" href="#goingSect">${ popupData[0].title } <u>(${ popupData[0].count })</u></a></li>
                            ${ $notGoingTab }
                        </ul>
                        <div class="tab-content">        
                            <div id="goingSect" class="tab-pane fade in active">
                                <ul class="who_People">${ popupData[0].list }</ul>
                            </div>
                            ${ $notGoingTabContent }        
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}