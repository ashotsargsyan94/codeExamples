$(function () {
    var currentPane;
    var sharedWithType;
    var communityId;

    const init = function(postId) {
        $('#share-modal form input[name=originalPostId]').val(postId);

        const channelsTab = $('#share-modal button[data-pane="share-channels"]');
        channelsTab.removeClass('hidden');

        $('#share-modal .btnLst button:not(.hidden)').first().click();
    };

    $('#share-modal').on('popup.squirrel', (e) => {
        currentCommunityId = parseInt(window.community.id) || getCommunityIdFromDropdown();
        if (communityId != currentCommunityId) {
            communityId = currentCommunityId;
            $('#share-community-dropdown').ddslick('select', {value: communityId});
            checkCommunityMask(communityId);
        }

        $('#share-modal').find('.communityAdminToggle').appendTo('.header');

        const postId = e.postId;
        init(postId);
    });

    $('.button.emojis').click(e => {
        $('#share-modal .emojis-and-gifs').removeClass('hidden');
        $('#share-modal div[data-model="emoji-gif-popup"]').stop(true, true).fadeIn();
    });

    $(document).on('click', `
         .emojis-and-gifs div[data-model="emoji-gif-popup"] .emojiGifBackBtn, .emojis-and-gifs .emojiLst img,
         .emojis-and-gifs .gifLst img
    `, function () {
        $('#share-modal div[data-model="emoji-gif-popup"]').stop(true, true).fadeOut();
    });

    const addChannelGroup = function(container, text) {
        container.find('ul').append(`<li><h3>${text}</h3></li>`);
    };

    const addNewListItem = function(container, text, value, avatarUrl = null, groupedChannel = false) {
        const originListItem = $('#share-modal li.origin');
        let newItem = originListItem.clone();
        newItem.removeClass('hidden origin');
        newItem.find('.item-label') .text(text);

        const checkBox = newItem.find('input');
        checkBox.prop('disabled', false).val(value);

        if (avatarUrl) {
            newItem.find('img').attr('src', avatarUrl);
        }

        if (groupedChannel) {
            newItem.addClass('grouped-channel');
        }

        // Native event handles check on checkbox
        // but stop the event from bubbling to the list item event below
        newItem.find('input[type="checkbox"]').on('click', (e) => {
            e.stopPropagation();
        });

        newItem.on('click', (e) => {
            checkBox[0].checked = !checkBox[0].checked;
        });

        container.find('.chnlLstng').append(newItem);
    };

    $('#share-modal input').click(function (e) {
        $('#share-modal input[name="mentioned_id[]"]').remove();
        $(e.currentTarget).unbind().removeData();

        $(this).mentionable(
            urlFrom('load/message_mentions'),
            {minimumChar: 3, maxTags: 4}
        );
    });

    $(document).on('click', '#share-modal .emoji-widget .addGif', () => {
        const emojisWidget = $('#share-modal .emoji-widget');
        const loader = emojisWidget.find('.gifData .appLoad');
        const gifLst = emojisWidget.find('ul.gifLst');

        loader.removeClass('hidden');
        gifLst.addClass('hidden');

        findGifs(response => {
            renderGifs(response.data, gifLst)
            setTimeout(function () {
                const searchInput = emojisWidget.find('.emoji-widget #gifs-tab input');
                searchInput.focus().val('');
                loader.addClass('hidden');
                gifLst.removeClass('hidden');
            }, 1000);
        })
    });

    let gifsDebounceFunction;

    $(document).on('keyup', '#share-modal .emoji-widget input', e => {
        clearTimeout(gifsDebounceFunction);
        const input = $(e.currentTarget);
        const emojisWidget = $('#share-modal .emoji-widget');
        const gifLst = emojisWidget.find('ul.gifLst');

        gifsDebounceFunction = setTimeout(a => {
            findGifs(response => {
                gifLst.html('');
                renderGifs(response.data, gifLst)
            }, input.val());
        }, 1000)
    });

    function renderGifs(gifs, container) {
        for (const gif of gifs) {
            const images = gif.images;

            $(`<li><div><img src="${images.fixed_height.url}" data-url="${images.original.url}"></div></li>`)
                .click(e => {
                    const image = $(e.currentTarget).find('div').clone();
                    const attachments = $('#share-modal .attachments');
                    attachments.append(image);
                    attachments.append($('<input name="attachments[]" type="hidden">').val(images.original.url));
                })
                .appendTo(container);
        }
    }

    function findGifs(callback, term = null) {
        let data = {
            api_key: '5A1supzh2FV1cEqvkU3n54SLRlcfc7OF',
            lang: 'en',
            offset: 0,
            limit: 12,
            rating: 'G'
        }

        if (term) {
            data['q'] = term;
        }

        $.ajax({
            url: `https://api.giphy.com/v1/gifs/${term ? 'search' : 'trending'}`,
            method: 'get',
            data,
        }).done(function (response) {
            callback(response);
        })
    }

    $('#share-modal .emojiLst img').click(e => {
        const messageInput = $('#share-modal [name=message]');

        messageInput.val((_, old) => {
            const cursor = messageInput.get(0).selectionStart;
            const reaction = $(e.currentTarget).data('reaction');

            return old.substring(0, cursor) + reaction + old.substring(cursor)
        });
    });

    $('#share-modal .btnLst > button.tab').click(e => {
        const tab = $(e.currentTarget);
        const paneName = tab.attr('data-pane');
        const pane = $(`#share-modal #${paneName}`);
        sharedWithType = pane.data('type');
        $('#share-modal form input[type=checkbox]').prop('checked', false);
        $('#share-modal form input[name=sharedWithType]').val(sharedWithType);

        $('#share-modal .pane').addClass('hidden');
        pane.removeClass('hidden').addClass('active');
        tab.addClass('active');
        tab.siblings('.tab').removeClass('active');
        pane.trigger('pane-active.squirrel');
    });

    function clearList() {
        currentPane.find('.chnlLstng li').remove();
    }

    function generateChannelsList(communityId) {
        currentPane.find('ul.userLstng.chnlLstng').html(`
            <div class="appLoad">
                <div class="appLoader">
                    <span class="spiner"></span>
                </div>
            </div>
        `);

        $.post(urlFrom('community/shareableChannels'), { communityId }).then(response => {
            currentPane.find('ul.userLstng.chnlLstng').html('');

            let channels = response.channels.filter(ch => ch.name !== 'direct');

            if (!channels.length) {
                currentPane.find('ul.userLstng.chnlLstng').append('<li>No channels found</li>');
                return;
            }

            let groupedChannels = [];

            for (const channel of channels) {
                let groupName = channel.group_name || 'none';

                if (groupedChannels[groupName] == undefined) {
                    groupedChannels[groupName] = [];
                }

                groupedChannels[groupName].push(channel);
            }

            for (const groupName in groupedChannels) {
                if (groupName != 'none') {
                    addChannelGroup(currentPane, groupName);
                }

                for (const channel of groupedChannels[groupName]) {
                    let isGroupedChannel = Boolean(channel.group_name);
                    addNewListItem(currentPane, channel.name, channel.id, null, isGroupedChannel);
                }
            }

        });
    }

    function fetchDirectsChannels(communityId) {
        $.post(urlFrom('directs/list'), { communityId }).then(response => {
            generateDirectsList(communityId, response.directs);
        });
    }

    function generateDirectsList(communityId, directChannels) {
        // when a direct only has a single member, we store the memberId so we don't include them twice them when listing other friends to start directs with.
        var membersInOneOnOneDirects = [];

        const channelIds = directChannels
            .map(channel => channel.id);

        $.post(urlFrom('channels/membersByChannel'), { channelIds, communityId }).then(response => {
            for (channelId in response.data) {
                // don't include the current user in the list.
                let channelMembers = response.data[channelId]
                    .filter(channelMember => channelMember.id !== member.id);

                let memberNames = [];

                for (const channelMember of channelMembers) {
                    memberNames.push(`${channelMember.first_name} ${channelMember.last_name}`);
                }

                let avatarUrl = null;

                if (channelMembers.length === 1) {
                    // if for some reason they have a direct with only the community masked gnome dude, exclude it.
                    if (channelMembers[0].type === "gnome") {
                        continue;
                    }

                    avatarUrl = get_avatar_url(channelMembers[0].avatar, channelMembers[0].id, 'p100x100');
                    membersInOneOnOneDirects.push(channelMembers[0].id);
                }

                addNewListItem(currentPane, memberNames.join(', '), channelId, avatarUrl);
            }
        }).then(() => {
            generateFriendsList(communityId, membersInOneOnOneDirects);
        });
    }

    function generateFriendsList(communityId, membersInOneOnOneDirects) {
        $.ajax('/community/members', {
            method: 'post',
            data: {
                communityId,
                limit: 500, // todo: set up propper pagination once limit for endpoint is fixed (as right now it only works in some contexts).
            },
            success: response => {
                //remove any members from pre-existing one on one directs so they aren't listed twice.
                let members = response.members.filter(
                    member => membersInOneOnOneDirects.indexOf(member.id) === -1 && member.id !== window.member.id
                );

                if (members.length === 0) {
                    return;
                }

                addChannelGroup(currentPane, 'Other connections');

                for (const member of members) {
                    const fullName = `${member.first_name} ${member.last_name}`;
                    addNewListItem(currentPane, fullName, "member_" + member.id, member.avatar);
                }
            }
        });
    }

    $('#share-modal #share-channels').on('pane-active.squirrel', e => {
        currentPane = $(e.currentTarget);
        clearList();

        generateChannelsList(getCommunityIdFromDropdown());
    });

    $('#share-modal #share-directs').on('pane-active.squirrel', e => {
        currentPane = $(e.currentTarget);
        clearList();

        fetchDirectsChannels(getCommunityIdFromDropdown());
    });

    $('#share-modal form').submit((e) => {
        if (! ($('#share-modal form').data('event'))) {
            const formData = new FormData(e.currentTarget);
            const masked = (localStorage.getItem("masked") === 'true');
            const communityId = getCommunityIdFromDropdown();

            formData.append('communityId', communityId);
            formData.append('masked', masked && member.managedCommunities.includes(communityId) ? 1 : 0);

            const sharedWithIds = formData.getAll('sharedWithIds[]');
            const sharedWithType = formData.get('sharedWithType');

            if (sharedWithIds.length === 0 && sharedWithType != 'stream') {
                e.preventDefault();
                return;
            }

            $.ajax('api/post/share', {
                data: formData,
                method: 'post',
                processData: false,
                contentType: false,
                success: (response) => {
                    $('#share-modal .crosBtn').click();

                    const currentChannel = typeof mainData.channel.slug !== 'undefined'
                        ? mainData.channel.slug.toLowerCase()
                        : null;

                    const shareCount = $(`.cmntLst [data-post-id=${response.shared_post_id}] .share-count`);
                    shareCount.text(Number(shareCount.text()) + response.share_count);

                    if (currentChannel != sharedWithType.toLowerCase()) {
                        showMessage('Post shared successfully');
                    }
                },
                error: ({ responseJSON }) => {
                    showError(responseJSON.error || translate('Something went wrong. Please try again.'))
                }
            });
        }

        e.preventDefault();
    });

    $('#share-modal').on('closed.modal.squirrel', (e) => {
        const modal = $(e.currentTarget);

        modal.find('form').trigger('reset');
        modal.find('.tab[data-pane=share-stream]').click();
    });

    $(document).on('input', '#share-modal input.search', e => {
        const searchTerm = e.currentTarget.value.trim();
        const re = new RegExp(searchTerm, 'i');

        $('#share-modal ul li').each((_, listItem) => {
            const text = $(listItem).find('.item-label').text().trim();

            $(listItem).toggleClass('hidden', ! text.match(re));
        })
    });

    function getCommunityIdFromDropdown() {
        return parseInt($('#share-community-dropdown').data('ddslick').selectedData.value);
    }

    $(document).on("communityDropdownChanged", communityDropdownChangedHandler);

    function communityDropdownChangedHandler(e) {
        if (e.dropdownId !== "share-community-dropdown") {
            //must be a different community dropdown. ignore it.
            return;
        }

        let selectedCommunityId = getCommunityIdFromDropdown();
        if (communityId === selectedCommunityId) {
          // user selected the already selected community.
          return;
        }

        communityId = selectedCommunityId;
        checkCommunityMask(communityId);
        clearList();

        if (sharedWithType === 'channel') {
            generateChannelsList(communityId);
        } else if (sharedWithType === 'direct') {
            fetchDirectsChannels(communityId);
        }
    }

    function checkCommunityMask(communityId) {
        // get community data to make sure if in this community user has admin access
        $.post(urlFrom('community/getCommunityMaskData'),{communityId}).then((response) => {
            const $toggleWrapper = $('.communityAdminToggle');

            if (response.success) {
                $toggleWrapper.removeClass('hide');
            } else {
                $toggleWrapper.addClass('hide');
            }
        });
    }

    $('.popup[data-popup="share"]').on('closed.modal.squirrel', (e) => {
        localStorage.removeItem('masked');
    });
});
