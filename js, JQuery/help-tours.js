$(function(){
    $(document).on('navigation.engage.initialized', () => {
        const helpTourDisabled = true;

        const channel = mainData.channel.slug;

        if (helpTourDisabled || channel != 'stream' || community.id != 1) {
            return;
        }

        const initialHelpTourId = 1;

        const driver = new Driver({
            animate: false,
            allowClose: false,
            closeBtnText: translate('Later'),
            startBtnText: `${translate('Next')} <i class="fas fa-chevron-right" aria-hidden="true"></i>`,
            nextBtnText: `${translate('Next')} <i class="fas fa-chevron-right" aria-hidden="true"></i>`,
            prevBtnText: `<i class="fas fa-chevron-left" aria-hidden="true"></i> ${translate('Back')}`,
            onReset: (step) => {
                $('body').removeClass('flow');
                $('body *').css('pointer-events', 'auto');
            },
            onPrevious: (step) => {
                const events = step.popover.options.events || [];

                if ('onPrevious' in events) {
                    $('#engage').trigger(events.onPrevious);
                }
            },
            onNext: (step) => {
                const popoverOptions = step.popover.options;
                const isLastStep = popoverOptions.isLast;

                if (isLastStep) {
                    $.post(`api/help-tour/taken/${member.id}/${initialHelpTourId}`);
                }

                const events = popoverOptions.events || [];

                if ('onNext' in events) {
                    $('#engage').trigger(events.onNext);
                }
            },
            onHighlighted: (step) => {
                const popoverOptions = step.popover.options;
                const highlight = $('#driver-highlighted-element-stage');
                highlight.attr('class', 'driver-stage-no-animation');

                if (popoverOptions.className) {
                    highlight
                        .addClass(popoverOptions.className)
                        .addClass('highlight');
                }

            }
        });

        const isDesktop = window.matchMedia('(min-width: 992px)').matches;
        const platform = isDesktop ? 'desktop' : 'mobile';

        $.get(`api/help-tour/${initialHelpTourId}`, ({ helpTour }) => {
            if (! helpTour) {
                return;
            }

            const steps = [];

            for (const step of helpTour.options.steps) {
                const selector = step[`${platform}Selector`];

                if (! selector) {
                    continue;
                }

                const cssClasses = step[`${platform}Classes`] || [];

                steps.push({
                    element: selector,
                    popover: {
                        title: step.title,
                        description: step.description,
                        position: step[`${platform}Position`],
                        events: step.events,
                        className: cssClasses.length ? cssClasses.join(' ') : null,
                    }
                });
            }

            if (steps.length) {
                alert(translate('Welcome'), translate("Take a quick tour of our features.")).then(() => {
                    driver.defineSteps(steps);

                    $('body').addClass('flow');
                    $('body *').css('pointer-events', 'none');

                    driver.start();
                });
            }

            $('body').removeClass('flow');
            $('body *').css('pointer-events', 'auto');
        });
    });
});
