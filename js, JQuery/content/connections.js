"use strict";

function Connections(manager, addFriendsModalTemplate) {
    this.manager = manager;
    this.addFriendsModalTemplate = addFriendsModalTemplate;
    this.membersList = '';
    this.rootCommunityId = 1;

    $('#connections').data('ConnectionsObject', this);
}

Connections.prototype = {
    init() {
        this.loadData().then(
            this.setContent.bind(this)
        )
    },

    loadData() {
        return $.post(urlFrom('connections/index')).fail(showNetworkError);
    },

    setContent({ friends, connections }) {
        this.clearContent();
        this.initSearchMember();

        // process my friends connection
        this._processConnection({
            'id': this.rootCommunityId,
            'link': `${this.rootCommunityId}#friends`,
            'name': translate('My Friends'),
            'logo': member.avatar,
            'totalCount': friends.totalCount,
            'members': friends.members,
            'nextOffset': friends.nextOffset,
            'type': 'friends'
        });

        // process all communities connections
        if (connections.length > 0) {
            $.each(connections, (_, connection) => {
                connection.link = connection.id + '#community';
                connection.type = 'community';

                this._processConnection(connection);
            });
        }
    },

    _setMembersList(members, communityId) {
        this.membersList = '';

        $.each(members, (_, member) => {
            member.avatar = member.avatar || get_avatar_url();

            this.membersList += this.manager.render('memberRow', {...member, communityId}).html();
        });
    },

    _processConnection(connection, data) {
        let addFriendsButton = '';
        let communityId = parseInt(connection.id);
        const whoCanInvite = member.communities[communityId].config.can.invite;

        if (whoCanInvite === 'everybody' || whoCanInvite === 'admins' && member.managedCommunities.includes(communityId)) {
            addFriendsButton = /* template */`
                <div class="topHead merged-connections">
                    <span class="enableGenerateLink plusMini popBtn"
                        data-popup="add-connections" data-community-type="${member.communities[communityId].type}">
                        <img src="${urlFrom("/assets/images/site_icon/icon-friend.svg")}" />
                    </span>
                </div>`;

            if ($('#addConnections').length === 0) {
                $('#membersContainer').append(this.addFriendsModalTemplate(member.communities[communityId]))
            }
        }

        let leaveCommunityButton = communityId !== 1 ? `
            <div class="leaveCommunity">
                <p>${translate('Leave Community')}</p>
                <span class="cross"></span>
            </div>
        ` : '';

        this._setMembersList(connection.members, communityId);

        this.manager.render('members', {
            'id': connection.id,
            'link': connection.link,
            'name': connection.name,
            'avatar': connection.logo,
            'totalCount': connection.totalCount,
            'addFriendsButton' : addFriendsButton,
            'leaveCommunityButton' : leaveCommunityButton,
            'membersList': this.membersList,
            'nextOffset': connection.nextOffset,
            'loadMore': connection.totalCount > connection.nextOffset,
            'type': connection.type
        }, true).in('#membersContainer', this.manager.MODE_APPEND);

        $('.enableGenerateLink[data-popup="add-connections"]').on('click', function (e, target) {
            const communityType = $(e.currentTarget).data('community-type');
            const headerText = communityType === 'root' ?
                translate('Add Friends') :
                translate('Invite people to this Community');

            $('h2.friend-finder-header > span').text(headerText);
        });
    },

    clearContent() {
        $('#membersContainer').empty();
    },

    viewMoreFriends(button) {
        this._disableLoadMore(button);

        $.post(urlFrom('friends/index'), {
            'nextOffset': button.data('next-offset')
        }).then(response => {
            this._processViewMore(button, this.rootCommunityId, response);
        }).fail(showNetworkError);
    },

    viewMoreCommunityMembers(button) {
        const communityId = button.data('id');

        $.post(urlFrom('connections/more'), {
            'nextOffset': button.data('next-offset'),
            'communityId': communityId
        }).then(response => {
            this._processViewMore(button, communityId, response);
        }).fail(showNetworkError);
    },

    _disableLoadMore(button) {
        button.attr('disabled', true);
        button.addClass('loading');
    },

    _enableLoadMore(button) {
        button.attr('disabled', false);
        button.removeClass('loading');
    },

    _processViewMore(button, id, response) {
        if (response.members.length == 0) {
            button.hide();
            return;
        }

        button.data('next-offset', response.nextOffset);

        this._setMembersList(response.members, id);

        $(`#membersList_${id} li.loadMoreWrap`).before(this.membersList);

        if (button.data('total-count') <= response.nextOffset) {
            button.hide();
        }

        this._enableLoadMore(button);
    },

    toggleviewLst(target) {
        // in case if user click on edge of the button
        const $button = (typeof target.data('type') === 'undefined')
            ? target.parent()
            : target;

        if ($button.data('type') === 'grid') {
            $("#membersContainer").removeClass("listView");
            $("#connections .viewLst > li").removeClass("active");

            $button.parent().addClass("active");
        } else {
            $("#membersContainer").addClass("listView");
            $("#connections .viewLst > li").removeClass("active");

            $button.parent().addClass("active");
        }
    },

    toggleSearchInput() {
        const $searchWrap = $('#searchConnections');
        const $input = $('#searchConnections input');
        const $buttonIcon = $('#searchConnections button i');
        $input.val('');
        if ($searchWrap.hasClass('active')) {
            $buttonIcon.removeClass('fa-times').addClass('fa-search');
            $searchWrap.removeClass('active');
        } else {
            $buttonIcon.removeClass('fa-search').addClass('fa-times');
            $searchWrap.addClass('active');
            $input.focus();
        }
    },

    initSearchMember() {
        $( "#searchConnections input" ).autocomplete({
            minLength: 3,
            source: function(request, responseCallback) {
                $.post(urlFrom('connections/search'), request).then(({ members }) => {
                    responseCallback(members);
                }).fail(() => responseCallback([]));
            },
            create: function () {
                $(this).data('ui-autocomplete')._renderItem = function (ul, item) {
                    return $('<li class="ui-menu-item">')
                        .append(
                            `<div tabindex="-1" class="ui-menu-item-wrapper connectionsSearch">
                                <img src="${item.avatar}" alt="" width="12px" class="mr-1 mb-1">
                                <div>
                                    <span>${item.name}</span>
                                    ${item.communityList ? `<small>${item.communityList}</small>` : ``}
                                </div>
                            </div>`
                        )
                        .appendTo(ul);
                };
            },
            select: function(_, ui) {
                const communityId = (typeof ui.item.communities[0] === 'object')
                    ? ui.item.communities[0].id
                    : (typeof ui.item.communities.id === 'number') ? ui.item.communities.id : 1;

                window.location = communityId + '#profile/' + ui.item.id;

                return false;
            }
          });
    },
};
