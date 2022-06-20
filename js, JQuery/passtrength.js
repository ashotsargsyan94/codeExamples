(function ($, window, document) {
    var pluginName = "passtrength",
        defaults = {
            minChars: 8,
            passwordToggle: true,
            tooltip: true,
            textWeak: translate("Weak"),
            textMedium: translate("Medium"),
            textStrong: translate("Strong)"),
            textVeryStrong: translate("Very Strong"),
            eyeImg: "assets/images/site_icon/icon-eye.svg"
        };

    function Plugin(element, options) {
        this.element = element;
        this.$elem = $(this.element);
        this.options = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        _this = this;
        this.init();
    }

    Plugin.prototype = {
        init: function () {
            var _this = this,
                meter = jQuery("<div/>", { class: "passtrengthMeter" }),
                tooltip = jQuery("<div/>", { class: "tooltip", html: translate(`Minimum {{ minCharacters }} characters`, { minCharacters: this.options.minChars }) + "<br>" + translate("You may use any combination of uppercase and lowercase letters, numbers, and special characters, with at least one number and at least one letter") });

            meter.insertAfter(this.element);
            $(this.element).appendTo(meter);

            if (this.options.tooltip) {
                tooltip.appendTo(meter);
                var tooltipWidth = tooltip.outerWidth() / 2;
                tooltip.css("margin-left", -tooltipWidth);
            }

            this.$elem.bind("keyup keydown", function () {
                value = $(this).val();
                _this.check(value);
            });

            if (this.options.passwordToggle) {
                _this.togglePassword();
            }
        },

        check: function (value) {
            var secureTotal = 0,
                chars = 0,
                capitals = 0,
                numbers = 0,
                special = 0;
            (upperCase = /[\p{Lu}\p{Lo}]/u), (numbers = /\p{N}/u), (specialchars = /[^\p{L}\p{N}]/u);

            if (value.length >= this.options.minChars) {
                chars = 1;
            } else {
                chars = -1;
            }
            if (value.match(upperCase)) {
                capitals = 1;
            } else {
                capitals = 0;
            }
            if (value.match(numbers)) {
                numbers = 1;
            } else {
                numbers = 0;
            }
            if (value.match(specialchars)) {
                special = 1;
            } else {
                special = 0;
            }

            secureTotal = chars + capitals + numbers + special;
            securePercentage = (secureTotal / 4) * 100;

            this.addStatus(securePercentage);
        },

        addStatus: function (percentage) {
            var status = "",
                text = translate(`Minimum {{ minChars }} characters`, { minChars: this.options.minChars }) + "<br>" + translate("You may use any combination of uppercase and lowercase letters, numbers, and special characters (!@#$%^&*+), with at least one number and at least one letter"),
                meter = $(this.element).closest(".passtrengthMeter"),
                tooltip = meter.find(".tooltip");

            meter.attr("class", "passtrengthMeter");

            if (percentage >= 25) {
                meter.attr("class", "passtrengthMeter");
                status = "weak";
                text = this.options.textWeak;
            }
            if (percentage >= 50) {
                meter.attr("class", "passtrengthMeter");
                status = "medium";
                text = this.options.textMedium;
            }
            if (percentage >= 75) {
                meter.attr("class", "passtrengthMeter");
                status = "strong";
                text = this.options.textStrong;
            }
            if (percentage >= 100) {
                meter.attr("class", "passtrengthMeter");
                status = "very-strong";
                text = this.options.textVeryStrong;
            }
            meter.addClass(status);
            if (this.options.tooltip) {
                tooltip.html(text);
            }
        },

        togglePassword: function () {
            var buttonShow = jQuery("<span/>", { class: "showPassword", html: "<img src=" + this.options.eyeImg + " />" }),
                input = jQuery("<input/>", { type: "text", class: "txtBox" }),
                passwordInput = this;

            buttonShow.appendTo($(this.element).closest(".passtrengthMeter"));
            input.appendTo($(this.element).closest(".passtrengthMeter")).hide();

            $(this.element).bind("keyup keydown", function () {
                input.val($(passwordInput.element).val());
            });

            input.bind("keyup keydown", function () {
                $(passwordInput.element).val(input.val());
                value = $(this).val();
                _this.check(value);
            });

            $(document).on("click", ".showPassword", function () {
                buttonShow.toggleClass("active");
                input.toggle();
                $(passwordInput.element).toggle();
            });
        }
    };

    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (! $.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, options));
            }
        });
    };
})(jQuery, window, document);
