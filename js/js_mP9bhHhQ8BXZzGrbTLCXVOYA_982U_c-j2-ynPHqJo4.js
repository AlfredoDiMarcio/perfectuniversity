/**
 * @file
 * Cookie Compliance Javascript.
 *
 * Statuses:
 *  null: not yet agreed (or withdrawn), show popup
 *  0: Disagreed
 *  1: Agreed, show thank you banner
 *  2: Agreed.
 */

(function ($) {
  'use strict';
  var euCookieComplianceBlockCookies;

  Drupal.behaviors.eu_cookie_compliance_popup = {
    attach: function (context, settings) {
      $(Drupal.settings.eu_cookie_compliance.containing_element, context).once('eu-cookie-compliance', function () {

        // Initialize internal variables.
        _euccCurrentStatus = self.getCurrentStatus();
        _euccSelectedCategories = self.getAcceptedCategories();

        // If configured, check JSON callback to determine if in EU.
        if (Drupal.settings.eu_cookie_compliance.popup_eu_only_js) {
          if (Drupal.eu_cookie_compliance.showBanner()) {
            var url = Drupal.settings.basePath + Drupal.settings.pathPrefix + 'eu-cookie-compliance-check';
            var data = {};
            $.getJSON(url, data, function (data) {
              // If in the EU, show the compliance banner.
              if (data.in_eu) {
                Drupal.eu_cookie_compliance.execute();
              }

              // If not in EU, set an agreed cookie automatically.
              else {
                Drupal.eu_cookie_compliance.setStatus(2);
              }
            });
          }
        }

        // Otherwise, fallback to standard behavior which is to render the banner.
        else {
          Drupal.eu_cookie_compliance.execute();
        }
      }).addClass('eu-cookie-compliance-status-' + Drupal.eu_cookie_compliance.getCurrentStatus());
    }
  };

  // Sep up the namespace as a function to store list of arguments in a queue.
  Drupal.eu_cookie_compliance = Drupal.eu_cookie_compliance || function () {
    (Drupal.eu_cookie_compliance.queue = Drupal.eu_cookie_compliance.queue || []).push(arguments)
  };
  // Initialize the object with some data.
  Drupal.eu_cookie_compliance.a = +new Date;
  // A shorter name to use when accessing the namespace.
  var self = Drupal.eu_cookie_compliance;
  // Save our cookie preferences locally only.
  // Used by external scripts to modify data before it is used.
  var _euccSelectedCategories = [];
  var _euccCurrentStatus = null;
  self.updateSelectedCategories = function (categories) {
    _euccSelectedCategories = categories;
  }
  self.updateCurrentStatus = function (status) {
    _euccCurrentStatus = status;
  }

  Drupal.eu_cookie_compliance.execute = function () {
    try {
      if (!Drupal.settings.eu_cookie_compliance.popup_enabled) {
        return;
      }

      if (!Drupal.eu_cookie_compliance.cookiesEnabled()) {
        return;
      }

      if (typeof Drupal.eu_cookie_compliance.getVersion() === 'undefined') {
        // If version doesn't exist as a cookie, set it to the current one.
        // For modules that update to this, it prevents needless retriggering
        // For first time runs, it makes no difference as the other IF statements
        // below will still cause the popup to trigger
        // For incrementing the version, it also makes no difference as either it's
        // a returning user and will have a version set, or it's a new user and
        // the other checks will trigger it.
        Drupal.eu_cookie_compliance.setVersion();
      }

      Drupal.eu_cookie_compliance.updateCheck();
      var versionChanged = Drupal.eu_cookie_compliance.getVersion() !== Drupal.settings.eu_cookie_compliance.cookie_policy_version;
      // Closed if status has a value and the version hasn't changed.
      var closed = _euccCurrentStatus !== null && !versionChanged;
      if ((_euccCurrentStatus === 0 && Drupal.settings.eu_cookie_compliance.method === 'default') || _euccCurrentStatus === null || (Drupal.settings.eu_cookie_compliance.withdraw_enabled && Drupal.settings.eu_cookie_compliance.withdraw_button_on_info_popup) || versionChanged) {
        if (Drupal.settings.eu_cookie_compliance.withdraw_enabled || !Drupal.settings.eu_cookie_compliance.disagree_do_not_show_popup || _euccCurrentStatus === null || versionChanged) {
          // Detect mobile here and use mobile_popup_html_info, if we have a mobile device.
          if (window.matchMedia('(max-width: ' + Drupal.settings.eu_cookie_compliance.mobile_breakpoint + 'px)').matches && Drupal.settings.eu_cookie_compliance.use_mobile_message) {
            Drupal.eu_cookie_compliance.createPopup(Drupal.settings.eu_cookie_compliance.mobile_popup_html_info, closed);
          }
          else {
            Drupal.eu_cookie_compliance.createPopup(Drupal.settings.eu_cookie_compliance.popup_html_info, closed);
          }

          Drupal.eu_cookie_compliance.initPopup();
          Drupal.eu_cookie_compliance.resizeListener();
        }
      }
      if (_euccCurrentStatus === 1 && Drupal.settings.eu_cookie_compliance.popup_agreed_enabled) {
        // Thank you banner.
        Drupal.eu_cookie_compliance.createPopup(Drupal.settings.eu_cookie_compliance.popup_html_agreed);
        Drupal.eu_cookie_compliance.attachHideEvents();
      }
      else if (_euccCurrentStatus === 2 && Drupal.settings.eu_cookie_compliance.withdraw_enabled) {
        if (!Drupal.settings.eu_cookie_compliance.withdraw_button_on_info_popup) {
          Drupal.eu_cookie_compliance.createWithdrawBanner(Drupal.settings.eu_cookie_compliance.withdraw_markup);
          Drupal.eu_cookie_compliance.resizeListener();
        }
        Drupal.eu_cookie_compliance.attachWithdrawEvents();
      }
    }
    catch (e) {
    }
  };

  Drupal.eu_cookie_compliance.initPopup = function () {
    Drupal.eu_cookie_compliance.attachAgreeEvents();

    if (Drupal.settings.eu_cookie_compliance.method === 'categories') {
      Drupal.eu_cookie_compliance.setPreferenceCheckboxes(_euccSelectedCategories);
      Drupal.eu_cookie_compliance.attachSavePreferencesEvents();
    }

    if (Drupal.settings.eu_cookie_compliance.withdraw_enabled && Drupal.settings.eu_cookie_compliance.withdraw_button_on_info_popup) {
      Drupal.eu_cookie_compliance.attachWithdrawEvents();
      if (_euccCurrentStatus === 1 || _euccCurrentStatus === 2) {
        $('.eu-cookie-withdraw-button').show();
      }
    }
  }

  Drupal.eu_cookie_compliance.positionTab = function () {
    if (Drupal.settings.eu_cookie_compliance.popup_position) {
      var totalHeight = $('.eu-cookie-withdraw-tab').outerHeight() + $('.eu-cookie-compliance-banner').outerHeight();
      $('.eu-cookie-withdraw-tab').css('margin-top', totalHeight + 'px');
    }
  };

  Drupal.eu_cookie_compliance.createWithdrawBanner = function (html) {
    var $html = $('<div></div>').html(html);
    var $banner = $('.eu-cookie-withdraw-banner', $html);
    $html.attr('id', 'sliding-popup');
    $html.addClass('eu-cookie-withdraw-wrapper');

    if (!Drupal.settings.eu_cookie_compliance.popup_use_bare_css) {
      $banner.height(Drupal.settings.eu_cookie_compliance.popup_height)
          .width(Drupal.settings.eu_cookie_compliance.popup_width);
    }
    $html.hide();
    var height = 0;
    if (Drupal.settings.eu_cookie_compliance.popup_position) {
      $html.prependTo(Drupal.settings.eu_cookie_compliance.containing_element);
      height = $html.outerHeight();

      $html.show()
          .addClass('sliding-popup-top')
          .addClass('clearfix')
          .css({ top: !Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top')) + height) : -1 * height });
      // For some reason, the tab outerHeight is -10 if we don't use a timeout
      // function to reveal the tab.
      setTimeout(function () {
        $html.animate({ top: !Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top')) + height) : -1 * height }, Drupal.settings.eu_cookie_compliance.popup_delay, null, function () {
          $html.trigger('eu_cookie_compliance_popup_open');
          $('body').addClass('eu-cookie-compliance-popup-open');
          Drupal.eu_cookie_compliance.positionTab();
        });
      }.bind($html, height), 0);
    }
    else {
      if (Drupal.settings.eu_cookie_compliance.better_support_for_screen_readers) {
        $html.prependTo(Drupal.settings.eu_cookie_compliance.containing_element);
      }
      else {
        $html.appendTo(Drupal.settings.eu_cookie_compliance.containing_element);
      }
      height = $html.outerHeight();
      $html.show()
          .addClass('sliding-popup-bottom')
          .css({ bottom: -1 * height });
      // For some reason, the tab outerHeight is -10 if we don't use a timeout
      // function to reveal the tab.
      setTimeout(function () {
        $html.animate({ bottom: -1 * height }, Drupal.settings.eu_cookie_compliance.popup_delay, null, function () {
          $html.trigger('eu_cookie_compliance_popup_open');
          $('body').addClass('eu-cookie-compliance-popup-open');
        });
      }.bind($html, height), 0);
    }
  };

  Drupal.eu_cookie_compliance.toggleWithdrawBanner = function () {
    var $wrapper = $('#sliding-popup');
    var height = $wrapper.outerHeight();
    var $bannerIsShowing = ($wrapper.find('.eu-cookie-compliance-banner, .eu-cookie-withdraw-banner').is(':visible'));
    if ($bannerIsShowing) {
      $bannerIsShowing = Drupal.settings.eu_cookie_compliance.popup_position ? parseInt($wrapper.css('top')) === (!Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top'))) : 0) : parseInt($wrapper.css('bottom')) === 0;
    }
    if (Drupal.settings.eu_cookie_compliance.popup_position) {
      if ($bannerIsShowing) {
        $wrapper.animate({ top: !Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top')) + height) : -1 * height }, Drupal.settings.eu_cookie_compliance.popup_delay).trigger('eu_cookie_compliance_popup_close');
        $('body').removeClass('eu-cookie-compliance-popup-open');
      }
      else {
        // If "Do not show cookie policy when the user clicks the Cookie policy button." is
        // selected, the inner banner may be hidden.
        $wrapper.find('.eu-cookie-compliance-banner').show();
        $wrapper.animate({ top: !Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top'))) : 0 }, Drupal.settings.eu_cookie_compliance.popup_delay).trigger('eu_cookie_compliance_popup_open');
        $('body').addClass('eu-cookie-compliance-popup-open');
      }
    }
    else {
      if ($bannerIsShowing) {
        $wrapper.animate({ 'bottom': -1 * height }, Drupal.settings.eu_cookie_compliance.popup_delay).trigger('eu_cookie_compliance_popup_close');
        $('body').removeClass('eu-cookie-compliance-popup-open');
      }
      else {
        // If "Do not show cookie policy when the user clicks the Cookie policy button." is
        // selected, the inner banner may be hidden.
        $wrapper.find('.eu-cookie-compliance-banner').show();
        $wrapper.animate({ 'bottom': 0 }, Drupal.settings.eu_cookie_compliance.popup_delay).trigger('eu_cookie_compliance_popup_open');
        $('body').addClass('eu-cookie-compliance-popup-open');
      }
    }
  };

  Drupal.eu_cookie_compliance.resizeListener = function () {
    var $wrapper = $('#sliding-popup');

    const debounce = function (func, wait ) {
      var timeout;

      return function executedFunction() {
        var later = function () {
          clearTimeout(timeout);
          func();
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    var checkIfPopupIsClosed = debounce(function () {
      var wrapperHeight = $wrapper.outerHeight();
      if (Drupal.settings.eu_cookie_compliance.popup_position) {
        var wrapperTopProperty = parseFloat($wrapper.css('bottom'));
        if (wrapperTopProperty !== 0) {
          $wrapper.css('top', wrapperHeight * -1);
        }
      }
      else {
        var wrapperBottomProperty = parseFloat($wrapper.css('bottom'));
        if (wrapperBottomProperty !== 0) {
          $wrapper.css('bottom', wrapperHeight * -1);
        }
      }
    }, 50);

    setTimeout(function () {
      checkIfPopupIsClosed();
    });

    window.addEventListener('resize', checkIfPopupIsClosed);

  };

  Drupal.eu_cookie_compliance.createPopup = function (html, closed) {
    // This fixes a problem with jQuery 1.9.
    var $popup = $('<div></div>').html(html);
    $popup.attr('id', 'sliding-popup');
    if (!Drupal.settings.eu_cookie_compliance.popup_use_bare_css) {
      $popup.height(Drupal.settings.eu_cookie_compliance.popup_height)
          .width(Drupal.settings.eu_cookie_compliance.popup_width);
    }

    $popup.hide();
    var height = 0;
    if (Drupal.settings.eu_cookie_compliance.popup_position) {
      $popup.prependTo(Drupal.settings.eu_cookie_compliance.containing_element);
      height = $popup.outerHeight();
      $popup.show()
        .attr({ 'class': 'sliding-popup-top clearfix' })
        .css({ top: !Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top')) + height) : -1 * height });
      if (closed !== true) {
        $popup.animate({ top: !Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top'))) : 0 }, Drupal.settings.eu_cookie_compliance.popup_delay, null, function () {
          $popup.trigger('eu_cookie_compliance_popup_open');
          $('body').addClass('eu-cookie-compliance-popup-open');
          Drupal.eu_cookie_compliance.positionTab();
        });
      }
      else {
        setTimeout(function () {
          Drupal.eu_cookie_compliance.positionTab();
        }, 0);
      }
    }
    else {
      if (Drupal.settings.eu_cookie_compliance.better_support_for_screen_readers) {
        $popup.prependTo(Drupal.settings.eu_cookie_compliance.containing_element);
      }
      else {
        $popup.appendTo(Drupal.settings.eu_cookie_compliance.containing_element);
      }

      height = $popup.outerHeight();
      $popup.show()
        .attr({ 'class': 'sliding-popup-bottom' })
        .css({ bottom: -1 * height });
      if (closed !== true) {
        $popup.animate({bottom: 0}, Drupal.settings.eu_cookie_compliance.popup_delay, null, function () {
          $popup.trigger('eu_cookie_compliance_popup_open');
          $('body').addClass('eu-cookie-compliance-popup-open');
        });
      }
    }
  };

  Drupal.eu_cookie_compliance.attachAgreeEvents = function () {
    var clickingConfirms = Drupal.settings.eu_cookie_compliance.popup_clicking_confirmation;
    var scrollConfirms = Drupal.settings.eu_cookie_compliance.popup_scrolling_confirmation;

    if (Drupal.settings.eu_cookie_compliance.method === 'categories' && Drupal.settings.eu_cookie_compliance.enable_save_preferences_button) {
      // The agree button becomes an agree to all categories button when the 'save preferences' button is present.
      $('.agree-button').click(Drupal.eu_cookie_compliance.acceptAllAction);
    }
    else {
      $('.agree-button').click(Drupal.eu_cookie_compliance.acceptAction);
    }
    $('.decline-button').click(Drupal.eu_cookie_compliance.declineAction);

    if (clickingConfirms) {
      $('a, input[type=submit], button[type=submit]').not('.popup-content *').bind('click.euCookieCompliance', Drupal.eu_cookie_compliance.acceptAction);
    }

    if (scrollConfirms) {
      var alreadyScrolled = false;
      var scrollHandler = function () {
        if (alreadyScrolled) {
          Drupal.eu_cookie_compliance.acceptAction();
          $(window).off('scroll', scrollHandler);
        }
        else {
          alreadyScrolled = true;
        }
      };

      $(window).bind('scroll', scrollHandler);
    }

    $('.find-more-button').not('.find-more-button-processed').addClass('find-more-button-processed').click(Drupal.eu_cookie_compliance.moreInfoAction);
  };

  Drupal.eu_cookie_compliance.attachSavePreferencesEvents = function () {
    $('.eu-cookie-compliance-save-preferences-button').click(Drupal.eu_cookie_compliance.savePreferencesAction);
  };

  Drupal.eu_cookie_compliance.attachHideEvents = function () {
    var popupHideAgreed = Drupal.settings.eu_cookie_compliance.popup_hide_agreed;
    var clickingConfirms = Drupal.settings.eu_cookie_compliance.popup_clicking_confirmation;
    $('.hide-popup-button').click(function () {
      Drupal.eu_cookie_compliance.changeStatus(2);
    }
    );
    if (clickingConfirms) {
      $('a, input[type=submit], button[type=submit]').unbind('click.euCookieCompliance');
    }

    if (popupHideAgreed) {
      $('a, input[type=submit], button[type=submit]').bind('click.euCookieComplianceHideAgreed', function () {
        Drupal.eu_cookie_compliance.changeStatus(2);
      });
    }

    $('.find-more-button').not('.find-more-button-processed').addClass('find-more-button-processed').click(Drupal.eu_cookie_compliance.moreInfoAction);
  };

  Drupal.eu_cookie_compliance.attachWithdrawEvents = function () {
    $('.eu-cookie-withdraw-button').click(Drupal.eu_cookie_compliance.withdrawAction);
    $('.eu-cookie-withdraw-tab').click(Drupal.eu_cookie_compliance.toggleWithdrawBanner);
  };

  Drupal.eu_cookie_compliance.acceptAction = function () {
    var agreedEnabled = Drupal.settings.eu_cookie_compliance.popup_agreed_enabled;
    var nextStatus = 1;
    if (!agreedEnabled) {
      Drupal.eu_cookie_compliance.setStatus(1);
      nextStatus = 2;
    }

    if (!euCookieComplianceHasLoadedScripts && typeof euCookieComplianceLoadScripts === "function") {
      euCookieComplianceLoadScripts();
    }

    if (typeof euCookieComplianceBlockCookies !== 'undefined') {
      clearInterval(euCookieComplianceBlockCookies);
    }

    if (Drupal.settings.eu_cookie_compliance.method === 'categories') {
      // Select Checked categories.
      var categories = $("#eu-cookie-compliance-categories input:checkbox:checked").map(function () {
        return $(this).val();
      }).get();
      Drupal.eu_cookie_compliance.setAcceptedCategories(categories);
      // Load scripts for all categories. If no categories selected, none
      // will be loaded.
      Drupal.eu_cookie_compliance.loadCategoryScripts(categories);
      if (!categories.length) {
        // No categories selected is the same as declining all cookies.
        nextStatus = 0;
      }
    }

    Drupal.eu_cookie_compliance.changeStatus(nextStatus);

    if (Drupal.settings.eu_cookie_compliance.withdraw_enabled && Drupal.settings.eu_cookie_compliance.withdraw_button_on_info_popup) {
      Drupal.eu_cookie_compliance.attachWithdrawEvents();
      if (_euccCurrentStatus === 1 || _euccCurrentStatus === 2) {
        $('.eu-cookie-withdraw-button').show();
      }
    }
  };

  Drupal.eu_cookie_compliance.acceptAllAction = function () {
    var allCategories = Drupal.settings.eu_cookie_compliance.cookie_categories;
    Drupal.eu_cookie_compliance.setPreferenceCheckboxes(allCategories);
    Drupal.eu_cookie_compliance.acceptAction();
  }

  Drupal.eu_cookie_compliance.savePreferencesAction = function () {
    var categories = $("#eu-cookie-compliance-categories input:checkbox:checked").map(function () {
      return $(this).val();
    }).get();
    var agreedEnabled = Drupal.settings.eu_cookie_compliance.popup_agreed_enabled;
    var nextStatus = 1;
    if (!agreedEnabled) {
      Drupal.eu_cookie_compliance.setStatus(1);
      nextStatus = 2;
    }

    Drupal.eu_cookie_compliance.setAcceptedCategories(categories);
    // Load scripts for all categories. If no categories selected, none
    // will be loaded.
    Drupal.eu_cookie_compliance.loadCategoryScripts(categories);
    if (!categories.length) {
      // No categories selected is the same as declining all cookies.
      nextStatus = 0;
    }
    Drupal.eu_cookie_compliance.changeStatus(nextStatus);
  };

  Drupal.eu_cookie_compliance.loadCategoryScripts = function (categories) {
    for (var cat in categories) {
      if (euCookieComplianceHasLoadedScriptsForCategory[cat] !== true && typeof euCookieComplianceLoadScripts === "function") {
        euCookieComplianceLoadScripts(categories[cat]);
        euCookieComplianceHasLoadedScriptsForCategory[cat] = true;
      }
    }
  }

  Drupal.eu_cookie_compliance.declineAction = function () {
    Drupal.eu_cookie_compliance.setStatus(0);
    var popup = $('#sliding-popup');
    if (popup.hasClass('sliding-popup-top')) {
      popup.animate({ top: !Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top')) + popup.outerHeight()) : popup.outerHeight() * -1 }, Drupal.settings.eu_cookie_compliance.popup_delay, null, function () {
        popup.hide();
      }).trigger('eu_cookie_compliance_popup_close');
      $('body').removeClass('eu-cookie-compliance-popup-open');
    }
    else {
      popup.animate({ bottom: popup.outerHeight() * -1 }, Drupal.settings.eu_cookie_compliance.popup_delay, null, function () {
        popup.hide();
      }).trigger('eu_cookie_compliance_popup_close');
      $('body').removeClass('eu-cookie-compliance-popup-open');
    }
  };

  Drupal.eu_cookie_compliance.withdrawAction = function () {
    Drupal.eu_cookie_compliance.setStatus(null);
    Drupal.eu_cookie_compliance.setAcceptedCategories([]);
    location.reload();
  };

  Drupal.eu_cookie_compliance.moreInfoAction = function () {
    if (Drupal.settings.eu_cookie_compliance.disagree_do_not_show_popup) {
      Drupal.eu_cookie_compliance.setStatus(0);
      if (Drupal.settings.eu_cookie_compliance.withdraw_enabled && Drupal.settings.eu_cookie_compliance.withdraw_button_on_info_popup) {
        $('#sliding-popup .eu-cookie-compliance-banner').trigger('eu_cookie_compliance_popup_close').hide();
        $('body').removeClass('eu-cookie-compliance-popup-open');
      }
      else {
        $('#sliding-popup').trigger('eu_cookie_compliance_popup_close').remove();
        $('body').removeClass('eu-cookie-compliance-popup-open');
      }
    }
    else {
      if (Drupal.settings.eu_cookie_compliance.popup_link_new_window) {
        window.open(Drupal.settings.eu_cookie_compliance.popup_link);
      }
      else {
        window.location.href = Drupal.settings.eu_cookie_compliance.popup_link;
      }
    }
  };

  Drupal.eu_cookie_compliance.getCurrentStatus = function () {
    // Make a new observer & fire it to allow other scripts to hook in.
    var preStatusLoadObject = new PreStatusLoad();
    self.handleEvent('preStatusLoad', preStatusLoadObject);

    var cookieName = (typeof eu_cookie_compliance_cookie_name === 'undefined' || eu_cookie_compliance_cookie_name === '') ? 'cookie-agreed' : eu_cookie_compliance_cookie_name;
    var storedStatus = $.cookie(cookieName);
    _euccCurrentStatus = parseInt(storedStatus);
    if (isNaN(_euccCurrentStatus)) {
      _euccCurrentStatus = null;
    }

    // Make a new observer & fire it to allow other scripts to hook in.
    var postStatusLoadObject = new PostStatusLoad();
    self.handleEvent('postStatusLoad', postStatusLoadObject);

    return _euccCurrentStatus;
  };

  Drupal.eu_cookie_compliance.setPreferenceCheckboxes = function (categories) {
    for (var i in categories) {
      $("#eu-cookie-compliance-categories input:checkbox[value='" + categories[i] + "']").attr("checked", "checked");
    }
  }

  Drupal.eu_cookie_compliance.getAcceptedCategories = function () {
    // Make a new observer & fire it to allow other scripts to hook in.
    var prePreferencesLoadObject = new PrePreferencesLoad();
    self.handleEvent('prePreferencesLoad', prePreferencesLoadObject);

    var cookieName = (typeof eu_cookie_compliance_cookie_name === 'undefined' || eu_cookie_compliance_cookie_name === '') ? 'cookie-agreed-categories' : Drupal.settings.eu_cookie_compliance.cookie_name + '-categories';
    var storedCategories = $.cookie(cookieName);

    if (storedCategories !== null && typeof storedCategories !== 'undefined') {
      _euccSelectedCategories = JSON.parse(storedCategories);
    }
    else {
      _euccSelectedCategories = [];
    }

    // Merge in required categories if not already present. Mimics old
    // logic where "fix first category" changed logic in
    // .hasAgreedWithCategory and this function.
    for (var _categoryName in Drupal.settings.eu_cookie_compliance.cookie_categories_details) {
      var _category = Drupal.settings.eu_cookie_compliance.cookie_categories_details[_categoryName];
      if (_category.checkbox_default_state === 'required' && $.inArray(_category.machine_name, _euccSelectedCategories) === -1) {
        _euccSelectedCategories.push(_category.machine_name);
      }
    }

    // Make a new observer & fire it to allow other scripts to hook in.
    var postPreferencesLoadObject = new PostPreferencesLoad();
    self.handleEvent('postPreferencesLoad', postPreferencesLoadObject);

    return _euccSelectedCategories;
  };

  Drupal.eu_cookie_compliance.changeStatus = function (value) {
    var reloadPage = Drupal.settings.eu_cookie_compliance.reload_page;
    var previousState = _euccCurrentStatus;
    if (_euccCurrentStatus === value) {
      return;
    }

    if (Drupal.settings.eu_cookie_compliance.popup_position) {
      $('.sliding-popup-top').animate({ top: !Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top')) + $('#sliding-popup').outerHeight()) : $('#sliding-popup').outerHeight() * -1 }, Drupal.settings.eu_cookie_compliance.popup_delay, function () {
        if (value === 1 && previousState === null && !reloadPage) {
          $('.sliding-popup-top').not('.eu-cookie-withdraw-wrapper').html(Drupal.settings.eu_cookie_compliance.popup_html_agreed).animate({ top: !Drupal.settings.eu_cookie_compliance.fixed_top_position ? -(parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('padding-top')) + parseInt($(Drupal.settings.eu_cookie_compliance.containing_element).css('margin-top'))) : 0 }, Drupal.settings.eu_cookie_compliance.popup_delay);
          Drupal.eu_cookie_compliance.attachHideEvents();
        }
        else if (previousState === 1) {
          if (Drupal.settings.eu_cookie_compliance.withdraw_enabled && Drupal.settings.eu_cookie_compliance.withdraw_button_on_info_popup) {
            // Restore popup content.
            if (window.matchMedia('(max-width: ' + Drupal.settings.eu_cookie_compliance.mobile_breakpoint + 'px)').matches && Drupal.settings.eu_cookie_compliance.use_mobile_message) {
              $('.sliding-popup-top').not('.eu-cookie-withdraw-wrapper').html(Drupal.settings.eu_cookie_compliance.mobile_popup_html_info);
            }
            else {
              $('.sliding-popup-top').not('.eu-cookie-withdraw-wrapper').html(Drupal.settings.eu_cookie_compliance.popup_html_info);
            }
            Drupal.eu_cookie_compliance.initPopup();
            Drupal.eu_cookie_compliance.resizeListener();
          }
          else {
            $('.sliding-popup-top').not('.eu-cookie-withdraw-wrapper').trigger('eu_cookie_compliance_popup_close').remove();
            $('body').removeClass('eu-cookie-compliance-popup-open');
          }
        }
        if (Drupal.settings.eu_cookie_compliance.withdraw_enabled) {
          Drupal.eu_cookie_compliance.showWithdrawBanner(value);
        }
      });
    }
    else {
      $('.sliding-popup-bottom').animate({ bottom: $('#sliding-popup').outerHeight() * -1 }, Drupal.settings.eu_cookie_compliance.popup_delay, function () {
        if (value === 1 && previousState === null && !reloadPage) {
          $('.sliding-popup-bottom').not('.eu-cookie-withdraw-wrapper').html(Drupal.settings.eu_cookie_compliance.popup_html_agreed).animate({ bottom: 0 }, Drupal.settings.eu_cookie_compliance.popup_delay);
          Drupal.eu_cookie_compliance.attachHideEvents();
        }
        else if (previousState === 1) {
          if (Drupal.settings.eu_cookie_compliance.withdraw_enabled && Drupal.settings.eu_cookie_compliance.withdraw_button_on_info_popup) {
            // Restore popup content.
            if (window.matchMedia('(max-width: ' + Drupal.settings.eu_cookie_compliance.mobile_breakpoint + 'px)').matches && Drupal.settings.eu_cookie_compliance.use_mobile_message) {
              $('.sliding-popup-bottom').not('.eu-cookie-withdraw-wrapper').html(Drupal.settings.eu_cookie_compliance.mobile_popup_html_info);
            }
            else {
              $('.sliding-popup-bottom').not('.eu-cookie-withdraw-wrapper').html(Drupal.settings.eu_cookie_compliance.popup_html_info);
            }
            Drupal.eu_cookie_compliance.initPopup();
            Drupal.eu_cookie_compliance.resizeListener();
          }
          else {
            $('.sliding-popup-bottom').not('.eu-cookie-withdraw-wrapper').trigger('eu_cookie_compliance_popup_close').remove();
            $('body').removeClass('eu-cookie-compliance-popup-open');
          }
        }
        if (Drupal.settings.eu_cookie_compliance.withdraw_enabled) {
          Drupal.eu_cookie_compliance.showWithdrawBanner(value);
        }
      });
    }

    if (reloadPage) {
      location.reload();
    }

    Drupal.eu_cookie_compliance.setStatus(value);
  };

  Drupal.eu_cookie_compliance.showWithdrawBanner = function (value) {
    if (value === 2 && Drupal.settings.eu_cookie_compliance.withdraw_enabled) {
      if (!Drupal.settings.eu_cookie_compliance.withdraw_button_on_info_popup) {
        Drupal.eu_cookie_compliance.createWithdrawBanner(Drupal.settings.eu_cookie_compliance.withdraw_markup);
        Drupal.eu_cookie_compliance.resizeListener();
      }
      Drupal.eu_cookie_compliance.attachWithdrawEvents();
      Drupal.eu_cookie_compliance.positionTab();
    }
  };

  Drupal.eu_cookie_compliance.setStatus = function (status) {

    // Make a new observer & fire it to allow other scripts to hook in.
    var preStatusSaveObject = new PreStatusSave();
    self.handleEvent('preStatusSave', preStatusSaveObject);

    var date = new Date();
    var domain = Drupal.settings.eu_cookie_compliance.domain ? Drupal.settings.eu_cookie_compliance.domain : '';
    var path = Drupal.settings.eu_cookie_compliance.domain_all_sites ? '/' : Drupal.settings.basePath;
    var cookieName = (typeof eu_cookie_compliance_cookie_name === 'undefined' || eu_cookie_compliance_cookie_name === '') ? 'cookie-agreed' : eu_cookie_compliance_cookie_name;
    if (path.length > 1) {
      var pathEnd = path.length - 1;
      if (path.lastIndexOf('/') === pathEnd) {
        path = path.substring(0, pathEnd);
      }
    }

    var cookieSession = parseInt(Drupal.settings.eu_cookie_compliance.cookie_session);
    if (cookieSession) {
      $.cookie(cookieName, status, { path: path, domain: domain });
    }
    else {
      var lifetime = parseInt(Drupal.settings.eu_cookie_compliance.cookie_lifetime);
      date.setDate(date.getDate() + lifetime);
      $.cookie(cookieName, status, { expires: date, path: path, domain: domain });
    }
    _euccCurrentStatus = status;
    $(document).trigger('eu_cookie_compliance.changeStatus', [status]);
    // Status set means something happened, update the version.
    Drupal.eu_cookie_compliance.setVersion();

    // Store consent if applicable.
    if (Drupal.settings.eu_cookie_compliance.store_consent && ((status === 1 && Drupal.settings.eu_cookie_compliance.popup_agreed_enabled) || (status === 2  && !Drupal.settings.eu_cookie_compliance.popup_agreed_enabled))) {
      var url = Drupal.settings.basePath + Drupal.settings.pathPrefix + 'eu-cookie-compliance/store_consent/banner';
      $.post(url, {}, function (data) { });
    }

    // Make a new observer & fire it to allow other scripts to hook in.
    var postStatusSaveObject = new PostStatusSave();
    self.handleEvent('postStatusSave', postStatusSaveObject);

    if (status === 0 && Drupal.settings.eu_cookie_compliance.method === 'opt_out') {
      euCookieComplianceBlockCookies = setInterval(Drupal.eu_cookie_compliance.BlockCookies, 5000);
    }
  };

  Drupal.eu_cookie_compliance.setAcceptedCategories = function (categories) {

    // Make a new observer & fire it to allow other scripts to hook in.
    var prePreferencesSaveObject = new PrePreferencesSave();
    self.handleEvent('prePreferencesSave', prePreferencesSaveObject);

    var date = new Date();
    var domain = Drupal.settings.eu_cookie_compliance.domain ? Drupal.settings.eu_cookie_compliance.domain : '';
    var path = Drupal.settings.eu_cookie_compliance.domain_all_sites ? '/' : Drupal.settings.basePath;
    var cookieName = (typeof eu_cookie_compliance_cookie_name === 'undefined' || eu_cookie_compliance_cookie_name === '') ? 'cookie-agreed-categories' : Drupal.settings.eu_cookie_compliance.cookie_name + '-categories';
    if (path.length > 1) {
      var pathEnd = path.length - 1;
      if (path.lastIndexOf('/') === pathEnd) {
        path = path.substring(0, pathEnd);
      }
    }
    var categoriesString = JSON.stringify(categories);
    var cookie_session = parseInt(Drupal.settings.eu_cookie_compliance.cookie_session);
    if (cookie_session) {
      $.cookie(cookieName, categoriesString, { path: path, domain: domain });
    }
    else {
      var lifetime = parseInt(Drupal.settings.eu_cookie_compliance.cookie_lifetime);
      date.setDate(date.getDate() + lifetime);
      $.cookie(cookieName, categoriesString, { expires: date, path: path, domain: domain });
    }
    _euccSelectedCategories = categories;
    $(document).trigger('eu_cookie_compliance.changePreferences', [categories]);

    // TODO: Store categories with consent if applicable?
    // Make a new observer & fire it to allow other scripts to hook in.
    var postPreferencesSaveObject = new PostPreferencesSave();
    self.handleEvent('postPreferencesSave', postPreferencesSaveObject);
  };

  Drupal.eu_cookie_compliance.hasAgreed = function (category) {
    var agreed = (_euccCurrentStatus === 1 || _euccCurrentStatus === 2);

    if (category !== undefined && agreed) {
      agreed = Drupal.eu_cookie_compliance.hasAgreedWithCategory(category);
    }

    return agreed;
  };

  Drupal.eu_cookie_compliance.hasAgreedWithCategory = function (category) {
    return $.inArray(category, _euccSelectedCategories) !== -1;
  };

  Drupal.eu_cookie_compliance.showBanner = function () {
    var showBanner = false;
    if ((_euccCurrentStatus === 0 && Drupal.settings.eu_cookie_compliance.method === 'default') || _euccCurrentStatus === null) {
      if (!Drupal.settings.eu_cookie_compliance.disagree_do_not_show_popup || _euccCurrentStatus === null) {
        showBanner = true;
      }
    }
    else if (_euccCurrentStatus === 1 && Drupal.settings.eu_cookie_compliance.popup_agreed_enabled) {
      showBanner = true;
    }

    return showBanner;
  };

  Drupal.eu_cookie_compliance.cookiesEnabled = function () {
    var cookieEnabled = navigator.cookieEnabled;
    if (typeof navigator.cookieEnabled === 'undefined' && !cookieEnabled) {
      document.cookie = 'testCookie';
      cookieEnabled = (document.cookie.indexOf('testCookie') !== -1);
    }

    return cookieEnabled;
  };

  Drupal.eu_cookie_compliance.cookieMatches = function (cookieName, pattern) {
    if (cookieName === pattern) {
      return true;
    }
    if (pattern.indexOf('*') < 0) {
      return false;
    }
    try {
      var regexp = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.+') + '$', 'g');
      return regexp.test(cookieName);
    }
    catch (err) {
      return false;
    }
  };

  Drupal.eu_cookie_compliance.isAllowed = function (cookieName) {
    // Skip the PHP session cookie.
    if (cookieName.indexOf('SESS') === 0 || cookieName.indexOf('SSESS') === 0) {
      return true;
    }
    // Split the allowed cookies.
    var euCookieComplianceAllowlist = Drupal.settings.eu_cookie_compliance.allowed_cookies.split(/\r\n|\n|\r/g);

    // Add the EU Cookie Compliance cookie.
    euCookieComplianceAllowlist.push((typeof Drupal.settings.eu_cookie_compliance.cookie_name === 'undefined' || Drupal.settings.eu_cookie_compliance.cookie_name === '') ? 'cookie-agreed' : Drupal.settings.eu_cookie_compliance.cookie_name);
    euCookieComplianceAllowlist.push((typeof Drupal.settings.eu_cookie_compliance.cookie_name === 'undefined' || Drupal.settings.eu_cookie_compliance.cookie_name === '') ? 'cookie-agreed-categories' : Drupal.settings.eu_cookie_compliance.cookie_name + '-categories');
    euCookieComplianceAllowlist.push((typeof Drupal.settings.eu_cookie_compliance.cookie_name === 'undefined' || Drupal.settings.eu_cookie_compliance.cookie_name === '') ? 'cookie-agreed-version' : Drupal.settings.eu_cookie_compliance.cookie_name + '-version');

    // Check if the cookie is allowed.
    for (var item in euCookieComplianceAllowlist) {
      if (Drupal.eu_cookie_compliance.cookieMatches(cookieName, euCookieComplianceAllowlist[item])) {
        return true;
      }
      // Handle cookie names that are prefixed with a category.
      if (Drupal.settings.eu_cookie_compliance.method === 'categories') {
        var separatorPos = euCookieComplianceAllowlist[item].indexOf(":");
        if (separatorPos !== -1) {
          var category = euCookieComplianceAllowlist[item].substr(0, separatorPos);
          var wlCookieName = euCookieComplianceAllowlist[item].substr(separatorPos + 1);

          if (Drupal.eu_cookie_compliance.cookieMatches(cookieName, wlCookieName) && Drupal.eu_cookie_compliance.hasAgreedWithCategory(category)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // This code upgrades the cookie agreed status when upgrading for an old version.
  Drupal.eu_cookie_compliance.updateCheck = function () {
    var legacyCookie = 'cookie-agreed-' + Drupal.settings.eu_cookie_compliance.popup_language;
    var domain = Drupal.settings.eu_cookie_compliance.domain ? Drupal.settings.eu_cookie_compliance.domain : '';
    var path = Drupal.settings.eu_cookie_compliance.domain_all_sites ? '/' : Drupal.settings.basePath;
    var cookie = $.cookie(legacyCookie);
    var date = new Date();
    var cookieName = (typeof eu_cookie_compliance_cookie_name === 'undefined' || eu_cookie_compliance_cookie_name === '') ? 'cookie-agreed' : eu_cookie_compliance_cookie_name;

    // jQuery.cookie 1.0 (bundled with Drupal) returns null,
    // jQuery.cookie 1.4.1 (bundled with some themes) returns undefined.
    // We had a 1.4.1 related bug where the value was set to 'null' (string).
    if (cookie !== undefined && cookie !== null && cookie !== 'null') {
      date.setDate(date.getDate() + parseInt(Drupal.settings.eu_cookie_compliance.cookie_lifetime));
      $.cookie(cookieName, cookie, { expires: date, path:  path, domain: domain });

      // Use removeCookie if the function exists.
      if (typeof $.removeCookie !== 'undefined') {
        $.removeCookie(legacyCookie);
      }
      else {
        $.cookie(legacyCookie, null, { path: path, domain: domain });
      }
    }
  };

  Drupal.eu_cookie_compliance.getVersion = function () {
    var cookieName = (typeof Drupal.settings.eu_cookie_compliance.cookie_name === 'undefined' || Drupal.settings.eu_cookie_compliance.cookie_name === '') ? 'cookie-agreed-version' : Drupal.settings.eu_cookie_compliance.cookie_name + '-version';
    return $.cookie(cookieName);
  };

  Drupal.eu_cookie_compliance.setVersion = function () {
    var date = new Date();
    var domain = Drupal.settings.eu_cookie_compliance.domain ? Drupal.settings.eu_cookie_compliance.domain : '';
    var path = Drupal.settings.eu_cookie_compliance.domain_all_sites ? '/' : Drupal.settings.basePath;
    var cookieName = (typeof Drupal.settings.eu_cookie_compliance.cookie_name === 'undefined' || Drupal.settings.eu_cookie_compliance.cookie_name === '') ? 'cookie-agreed-version' : Drupal.settings.eu_cookie_compliance.cookie_name + '-version';

    if (path.length > 1) {
      var pathEnd = path.length - 1;
      if (path.lastIndexOf('/') === pathEnd) {
        path = path.substring(0, pathEnd);
      }
    }
    var eucc_version = Drupal.settings.eu_cookie_compliance.cookie_policy_version;
    var cookie_session = parseInt(Drupal.settings.eu_cookie_compliance.cookie_session);
    if (cookie_session) {
      $.cookie(cookieName, eucc_version, { path: path, domain: domain });
    }
    else {
      var lifetime = parseInt(Drupal.settings.eu_cookie_compliance.cookie_lifetime);
      date.setDate(date.getDate() + lifetime);
      $.cookie(cookieName, eucc_version, { expires: date, path: path, domain: domain });
    }
  };

  // Load blocked scripts if the user has agreed to being tracked.
  var euCookieComplianceHasLoadedScripts = false;
  var euCookieComplianceHasLoadedScriptsForCategory = [];
  $(function () {
    if (Drupal.eu_cookie_compliance.hasAgreed()
        || (_euccCurrentStatus === null && Drupal.settings.eu_cookie_compliance.method !== 'opt_in' && Drupal.settings.eu_cookie_compliance.method !== 'categories')
    ) {
      if (typeof euCookieComplianceLoadScripts === "function") {
        euCookieComplianceLoadScripts();
      }
      euCookieComplianceHasLoadedScripts = true;

      if (Drupal.settings.eu_cookie_compliance.method === 'categories') {
        Drupal.eu_cookie_compliance.loadCategoryScripts(_euccSelectedCategories);
      }
    }
  });

  // Block cookies when the user hasn't agreed.
  Drupal.behaviors.eu_cookie_compliance_popup_block_cookies = {
    initialized: false,
    attach: function (context, settings) {
      if (!Drupal.behaviors.eu_cookie_compliance_popup_block_cookies.initialized && settings.eu_cookie_compliance) {
        Drupal.behaviors.eu_cookie_compliance_popup_block_cookies.initialized = true;
        if (settings.eu_cookie_compliance.automatic_cookies_removal &&
          ((settings.eu_cookie_compliance.method === 'opt_in' && (_euccCurrentStatus === null || !Drupal.eu_cookie_compliance.hasAgreed()))
            || (settings.eu_cookie_compliance.method === 'opt_out' && !Drupal.eu_cookie_compliance.hasAgreed() && _euccCurrentStatus !== null)
          || (Drupal.settings.eu_cookie_compliance.method === 'categories'))
        ) {
          // Split the allowed cookies.
          var euCookieComplianceAllowlist = settings.eu_cookie_compliance.allowed_cookies.split(/\r\n|\n|\r/g);

          // Add the EU Cookie Compliance cookie.
          var cookieName = (typeof eu_cookie_compliance_cookie_name === 'undefined' || eu_cookie_compliance_cookie_name === '') ? 'cookie-agreed' : eu_cookie_compliance_cookie_name;
          euCookieComplianceAllowlist.push(cookieName);

          euCookieComplianceBlockCookies = setInterval(Drupal.eu_cookie_compliance.BlockCookies, 5000);
        }
      }
    }
  }

  Drupal.eu_cookie_compliance.BlockCookies = function () {
    // Load all cookies from jQuery.
    var cookies = $.cookie();

    // Check each cookie and try to remove it if it's not allowed.
    for (var i in cookies) {
      var remove = true;
      var hostname = window.location.hostname;
      var cookieRemoved = false;
      var index = 0;

      remove = !Drupal.eu_cookie_compliance.isAllowed(i);

      // Remove the cookie if it's not allowed.
      if (remove) {
        while (!cookieRemoved && hostname !== '') {
          // Attempt to remove.
          cookieRemoved = $.removeCookie(i, { domain: '.' + hostname, path: '/' });
          if (!cookieRemoved) {
            cookieRemoved = $.removeCookie(i, { domain: hostname, path: '/' });
          }

          index = hostname.indexOf('.');

          // We can be on a sub-domain, so keep checking the main domain as well.
          hostname = (index === -1) ? '' : hostname.substring(index + 1);
        }

        // Some jQuery Cookie versions don't remove cookies well.  Try again
        // using plain js.
        if (!cookieRemoved) {
          document.cookie = i + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
        }
      }
    }
  }

  /**
   * Filter the event listeners by event name and return the list of handlers.
   *
   * @param forEventName
   *
   * @returns {[]}
   */
  var filterQueue = function (forEventName) {
    var handlers = [];
    if (typeof Drupal.eu_cookie_compliance !== 'undefined' &&
      typeof Drupal.eu_cookie_compliance.queue !== 'undefined' &&
      Drupal.eu_cookie_compliance.queue.length) {
      // Loop over the list of arguments (objects) pushed into the queue.
      for (var i = 0; i < Drupal.eu_cookie_compliance.queue.length; i++) {
        if (Drupal.eu_cookie_compliance.queue[i].length) {
          var queueItem = Drupal.eu_cookie_compliance.queue[i];
          var eventName = queueItem[0];
          var eventHandler = queueItem[1];
          // If the first element is a string and the second is a function.
          if (typeof eventName === 'string' && typeof eventHandler === 'function') {
            // And the string matches the event name.
            if (eventName === forEventName) {
              // Return the functions so they can be executed.
              handlers.push(eventHandler);
            }
          }
        }
      }
    }
    return handlers;
  }

  /**
   * Handle event by finding and executing handlers pushed to the queue.
   */
  self.handleEvent = function (eventName, observer) {
    var handlers = filterQueue(eventName);
    for (var i = 0; i < handlers.length; i++) {
      if (typeof handlers[i] !== 'undefined') {
        observer.subscribe(handlers[i]);
        observer.fire({
          currentStatus: _euccCurrentStatus,
          currentCategories: _euccSelectedCategories
        });
        observer.unsubscribe(handlers[i]);
      }
    }
  };

  /**
   * Observer: triggered before status gets read from cookie.
   */
  var PreStatusLoad = (function () {
    // Constructor.
    var PreStatusLoad = function () {
      // Observers.
      this.handlers = [];
    };
    // Convenience var for the prototype.
    var prototype = PreStatusLoad.prototype;
    prototype.subscribe = function (fn) {
      this.handlers.push(fn);
    };
    prototype.unsubscribe = function (fn) {
      this.handlers = this.handlers.filter(
        function (item) {
          if (item !== fn) {
            return item;
          }
        }
      );
    };
    prototype.fire = function (o, thisObj) {
      var scope = thisObj || window;
      this.handlers.forEach(function (item) {
        item.call(scope, o);
      });
    };
    return PreStatusLoad;
  })();

  /**
   * Observer: triggered after status was read from cookie and stored in private variable.
   */
  var PostStatusLoad = (function () {
    // Constructor.
    var PostStatusLoad = function () {
      // Observers.
      this.handlers = [];
    };
    // Convenience var for the prototype.
    var prototype = PostStatusLoad.prototype;
    prototype.subscribe = function (fn) {
      this.handlers.push(fn);
    };
    prototype.unsubscribe = function (fn) {
      this.handlers = this.handlers.filter(
        function (item) {
          if (item !== fn) {
            return item;
          }
        }
      );
    };
    prototype.fire = function (o, thisObj) {
      var scope = thisObj || window;
      this.handlers.forEach(function (item) {
        item.call(scope, o);
      });
    };
    return PostStatusLoad;
  })();

  /**
   * Observer: triggered before status gets saved into cookie.
   */
  var PreStatusSave = (function () {
    // Constructor.
    var PreStatusSave = function () {
      // Observers.
      this.handlers = [];
    };
    // Convenience var for the prototype.
    var prototype = PreStatusSave.prototype;
    prototype.subscribe = function (fn) {
      this.handlers.push(fn);
    };
    prototype.unsubscribe = function (fn) {
      this.handlers = this.handlers.filter(
        function (item) {
          if (item !== fn) {
            return item;
          }
        }
      );
    };
    prototype.fire = function (o, thisObj) {
      var scope = thisObj || window;
      this.handlers.forEach(function (item) {
        item.call(scope, o);
      });
    };
    return PreStatusSave;
  })();

  /**
   * Observer: triggered after status was saved into cookie.
   */
  var PostStatusSave = (function () {
    // Constructor.
    var PostStatusSave = function () {
      // Observers.
      this.handlers = [];
    };
    // Convenience var for the prototype.
    var prototype = PostStatusSave.prototype;
    prototype.subscribe = function (fn) {
      this.handlers.push(fn);
    };
    prototype.unsubscribe = function (fn) {
      this.handlers = this.handlers.filter(
        function (item) {
          if (item !== fn) {
            return item;
          }
        }
      );
    };
    prototype.fire = function (o, thisObj) {
      var scope = thisObj || window;
      this.handlers.forEach(function (item) {
        item.call(scope, o);
      });
    };
    return PostStatusSave;
  })();

  /**
   * Observer: triggered before categories are read from cookie.
   */
  var PrePreferencesLoad = (function () {
    // Constructor.
    var prePreferencesLoad = function () {
      // Observers.
      this.handlers = [];
    };
    // Convenience var for the prototype.
    var prototype = prePreferencesLoad.prototype;
    prototype.subscribe = function (fn) {
      this.handlers.push(fn);
    };
    prototype.unsubscribe = function (fn) {
      this.handlers = this.handlers.filter(
        function (item) {
          if (item !== fn) {
            return item;
          }
        }
      );
    };
    prototype.fire = function (o, thisObj) {
      var scope = thisObj || window;
      this.handlers.forEach(function (item) {
        item.call(scope, o);
      });
    };
    return prePreferencesLoad;
  })();

  /**
   * Observer: triggered after categories were read from cookie.
   */
  var PostPreferencesLoad = (function () {
    // Constructor.
    var postPreferencesLoad = function () {
      // Observers.
      this.handlers = [];
    };
    // Convenience var for the prototype.
    var prototype = postPreferencesLoad.prototype;
    prototype.subscribe = function (fn) {
      this.handlers.push(fn);
    };
    prototype.unsubscribe = function (fn) {
      this.handlers = this.handlers.filter(
        function (item) {
          if (item !== fn) {
            return item;
          }
        }
      );
    };
    prototype.fire = function (o, thisObj) {
      var scope = thisObj || window;
      this.handlers.forEach(function (item) {
        item.call(scope, o);
      });
    };
    return postPreferencesLoad;
  })();

  /**
   * Observer: triggered before categories are being saved to cookie.
   */
  var PrePreferencesSave = (function () {
    // Constructor.
    var prePreferencesSave = function () {
      // Observers.
      this.handlers = [];
    };
    // Convenience var for the prototype.
    var prototype = prePreferencesSave.prototype;
    prototype.subscribe = function (fn) {
      this.handlers.push(fn);
    };
    prototype.unsubscribe = function (fn) {
      this.handlers = this.handlers.filter(
        function (item) {
          if (item !== fn) {
            return item;
          }
        }
      );
    };
    prototype.fire = function (o, thisObj) {
      var scope = thisObj || window;
      this.handlers.forEach(function (item) {
        item.call(scope, o);
      });
    };
    return prePreferencesSave;
  })();

  /**
   * Observer: triggered after categories were saved to cookie.
   */
  var PostPreferencesSave = (function () {
    // Constructor.
    var postPreferencesSave = function () {
      // Observers.
      this.handlers = [];
    };
    // Convenience var for the prototype.
    var prototype = postPreferencesSave.prototype;
    prototype.subscribe = function (fn) {
      this.handlers.push(fn);
    };
    prototype.unsubscribe = function (fn) {
      this.handlers = this.handlers.filter(
        function (item) {
          if (item !== fn) {
            return item;
          }
        }
      );
    };
    prototype.fire = function (o, thisObj) {
      var scope = thisObj || window;
      this.handlers.forEach(function (item) {
        item.call(scope, o);
      });
    };
    return postPreferencesSave;
  })();

})(jQuery);
;
(function ($, Drupal, window) {
  /**
   * Inclcude the newrelic JS.
   */
  Drupal.behaviors.the_cache_control_newrelic_browser = {
    attach: function (context) {
      $("body", context).once("nrb").ready(function() {
        // Start snippet.
        window.NREUM || (NREUM = {}), __nr_require = function (t, n, e) {
          function r(e) {
            if (!n[e]) {
              var o = n[e] = {exports: {}};
              t[e][0].call(o.exports, function (n) {
                var o = t[e][1][n];
                return r(o || n)
              }, o, o.exports)
            }
            return n[e].exports
          }

          if ("function" == typeof __nr_require) {
            return __nr_require;
          }
          for (var o = 0; o < e.length; o++) {
            r(e[o]);
          }
          return r
        }({
          1: [function (t, n, e) {
            function r(t) {
              try {
                s.console && console.log(t)
              }
              catch (n) {
              }
            }

            var o, i = t("ee"), a = t(18), s = {};
            try {
              o = localStorage.getItem("__nr_flags").split(","), console && "function" == typeof console.log && (s.console = !0, o.indexOf("dev") !== -1 && (s.dev = !0), o.indexOf("nr_dev") !== -1 && (s.nrDev = !0))
            }
            catch (c) {
            }
            s.nrDev && i.on("internal-error", function (t) {
              r(t.stack)
            }), s.dev && i.on("fn-err", function (t, n, e) {
              r(e.stack)
            }), s.dev && (r("NR AGENT IN DEVELOPMENT MODE"), r("flags: " + a(s, function (t, n) {
              return t
            }).join(", ")))
          }, {}], 2: [function (t, n, e) {
            function r(t, n, e, r, s) {
              try {
                p ? p -= 1 : o(s || new UncaughtException(t, n, e), !0)
              }
              catch (f) {
                try {
                  i("ierr", [f, c.now(), !0])
                }
                catch (d) {
                }
              }
              return "function" == typeof u && u.apply(this, a(arguments))
            }

            function UncaughtException(t, n, e) {
              this.message = t || "Uncaught error with no additional information", this.sourceURL = n, this.line = e
            }

            function o(t, n) {
              var e = n ? null : c.now();
              i("err", [t, e])
            }

            var i = t("handle"), a = t(19), s = t("ee"), c = t("loader"), f = t("gos"),
                u = window.onerror, d = !1, l = "nr@seenError", p = 0;
            c.features.err = !0, t(1), window.onerror = r;
            try {
              throw new Error
            }
            catch (h) {
              "stack" in h && (t(8), t(7), "addEventListener" in window && t(5), c.xhrWrappable && t(9), d = !0)
            }
            s.on("fn-start", function (t, n, e) {
              d && (p += 1)
            }), s.on("fn-err", function (t, n, e) {
              d && !e[l] && (f(e, l, function () {
                return !0
              }), this.thrown = !0, o(e))
            }), s.on("fn-end", function () {
              d && !this.thrown && p > 0 && (p -= 1)
            }), s.on("internal-error", function (t) {
              i("ierr", [t, c.now(), !0])
            })
          }, {}], 3: [function (t, n, e) {
            t("loader").features.ins = !0
          }, {}], 4: [function (t, n, e) {
            function r(t) {
            }

            if (window.performance && window.performance.timing && window.performance.getEntriesByType) {
              var o = t("ee"), i = t("handle"), a = t(8), s = t(7),
                  c = "learResourceTimings", f = "addEventListener",
                  u = "resourcetimingbufferfull", d = "bstResource", l = "resource",
                  p = "-start", h = "-end", m = "fn" + p, w = "fn" + h, v = "bstTimer",
                  y = "pushState", g = t("loader");
              g.features.stn = !0, t(6);
              var x = NREUM.o.EV;
              o.on(m, function (t, n) {
                var e = t[0];
                e instanceof x && (this.bstStart = g.now())
              }), o.on(w, function (t, n) {
                var e = t[0];
                e instanceof x && i("bst", [e, n, this.bstStart, g.now()])
              }), a.on(m, function (t, n, e) {
                this.bstStart = g.now(), this.bstType = e
              }), a.on(w, function (t, n) {
                i(v, [n, this.bstStart, g.now(), this.bstType])
              }), s.on(m, function () {
                this.bstStart = g.now()
              }), s.on(w, function (t, n) {
                i(v, [n, this.bstStart, g.now(), "requestAnimationFrame"])
              }), o.on(y + p, function (t) {
                this.time = g.now(), this.startPath = location.pathname + location.hash
              }), o.on(y + h, function (t) {
                i("bstHist", [location.pathname + location.hash, this.startPath, this.time])
              }), f in window.performance && (window.performance["c" + c] ? window.performance[f](u, function (t) {
                i(d, [window.performance.getEntriesByType(l)]), window.performance["c" + c]()
              }, !1) : window.performance[f]("webkit" + u, function (t) {
                i(d, [window.performance.getEntriesByType(l)]), window.performance["webkitC" + c]()
              }, !1)), document[f]("scroll", r, {passive: !0}), document[f]("keypress", r, !1), document[f]("click", r, !1)
            }
          }, {}], 5: [function (t, n, e) {
            function r(t) {
              for (var n = t; n && !n.hasOwnProperty(u);) {
                n = Object.getPrototypeOf(n);
              }
              n && o(n)
            }

            function o(t) {
              s.inPlace(t, [u, d], "-", i)
            }

            function i(t, n) {
              return t[1]
            }

            var a = t("ee").get("events"), s = t(21)(a, !0), c = t("gos"),
                f = XMLHttpRequest, u = "addEventListener", d = "removeEventListener";
            n.exports = a, "getPrototypeOf" in Object ? (r(document), r(window), r(f.prototype)) : f.prototype.hasOwnProperty(u) && (o(window), o(f.prototype)), a.on(u + "-start", function (t, n) {
              var e = t[1], r = c(e, "nr@wrapped", function () {
                function t() {
                  if ("function" == typeof e.handleEvent) {
                    return e.handleEvent.apply(e, arguments)
                  }
                }

                var n = {object: t, "function": e}[typeof e];
                return n ? s(n, "fn-", null, n.name || "anonymous") : e
              });
              this.wrapped = t[1] = r
            }), a.on(d + "-start", function (t) {
              t[1] = this.wrapped || t[1]
            })
          }, {}], 6: [function (t, n, e) {
            var r = t("ee").get("history"), o = t(21)(r);
            n.exports = r;
            var i = window.history && window.history.constructor && window.history.constructor.prototype,
                a = window.history;
            i && i.pushState && i.replaceState && (a = i), o.inPlace(a, ["pushState", "replaceState"], "-")
          }, {}], 7: [function (t, n, e) {
            var r = t("ee").get("raf"), o = t(21)(r), i = "equestAnimationFrame";
            n.exports = r, o.inPlace(window, ["r" + i, "mozR" + i, "webkitR" + i, "msR" + i], "raf-"), r.on("raf-start", function (t) {
              t[0] = o(t[0], "fn-")
            })
          }, {}], 8: [function (t, n, e) {
            function r(t, n, e) {
              t[0] = a(t[0], "fn-", null, e)
            }

            function o(t, n, e) {
              this.method = e, this.timerDuration = isNaN(t[1]) ? 0 : +t[1], t[0] = a(t[0], "fn-", this, e)
            }

            var i = t("ee").get("timer"), a = t(21)(i), s = "setTimeout",
                c = "setInterval", f = "clearTimeout", u = "-start", d = "-";
            n.exports = i, a.inPlace(window, [s, "setImmediate"], s + d), a.inPlace(window, [c], c + d), a.inPlace(window, [f, "clearImmediate"], f + d), i.on(c + u, r), i.on(s + u, o)
          }, {}], 9: [function (t, n, e) {
            function r(t, n) {
              d.inPlace(n, ["onreadystatechange"], "fn-", s)
            }

            function o() {
              var t = this, n = u.context(t);
              t.readyState > 3 && !n.resolved && (n.resolved = !0, u.emit("xhr-resolved", [], t)), d.inPlace(t, y, "fn-", s)
            }

            function i(t) {
              g.push(t), h && (b ? b.then(a) : w ? w(a) : (E = -E, R.data = E))
            }

            function a() {
              for (var t = 0; t < g.length; t++) {
                r([], g[t]);
              }
              g.length && (g = [])
            }

            function s(t, n) {
              return n
            }

            function c(t, n) {
              for (var e in t) {
                n[e] = t[e];
              }
              return n
            }

            t(5);
            var f = t("ee"), u = f.get("xhr"), d = t(21)(u), l = NREUM.o, p = l.XHR,
                h = l.MO, m = l.PR, w = l.SI, v = "readystatechange",
                y = ["onload", "onerror", "onabort", "onloadstart", "onloadend", "onprogress", "ontimeout"],
                g = [];
            n.exports = u;
            var x = window.XMLHttpRequest = function (t) {
              var n = new p(t);
              try {
                u.emit("new-xhr", [n], n), n.addEventListener(v, o, !1)
              }
              catch (e) {
                try {
                  u.emit("internal-error", [e])
                }
                catch (r) {
                }
              }
              return n
            };
            if (c(p, x), x.prototype = p.prototype, d.inPlace(x.prototype, ["open", "send"], "-xhr-", s), u.on("send-xhr-start", function (t, n) {
              r(t, n), i(n)
            }), u.on("open-xhr-start", r), h) {
              var b = m && m.resolve();
              if (!w && !m) {
                var E = 1, R = document.createTextNode(E);
                new h(a).observe(R, {characterData: !0})
              }
            }
            else {
              f.on("fn-end", function (t) {
                t[0] && t[0].type === v || a()
              })
            }
          }, {}], 10: [function (t, n, e) {
            function r() {
              var t = window.NREUM, n = t.info.accountID || null,
                  e = t.info.agentID || null, r = t.info.trustKey || null,
                  i = "btoa" in window && "function" == typeof window.btoa;
              if (!n || !e || !i) {
                return null;
              }
              var a = {
                v: [0, 1],
                d: {
                  ty: "Browser",
                  ac: n,
                  ap: e,
                  id: o.generateCatId(),
                  tr: o.generateCatId(),
                  ti: Date.now()
                }
              };
              return r && n !== r && (a.d.tk = r), btoa(JSON.stringify(a))
            }

            var o = t(16);
            n.exports = {generateTraceHeader: r}
          }, {}], 11: [function (t, n, e) {
            function r(t) {
              var n = this.params, e = this.metrics;
              if (!this.ended) {
                this.ended = !0;
                for (var r = 0; r < p; r++) {
                  t.removeEventListener(l[r], this.listener, !1);
                }
                n.aborted || (e.duration = s.now() - this.startTime, this.loadCaptureCalled || 4 !== t.readyState ? null == n.status && (n.status = 0) : a(this, t), e.cbTime = this.cbTime, d.emit("xhr-done", [t], t), c("xhr", [n, e, this.startTime]))
              }
            }

            function o(t, n) {
              var e = t.responseType;
              if ("json" === e && null !== n) {
                return n;
              }
              var r = "arraybuffer" === e || "blob" === e || "json" === e ? t.response : t.responseText;
              return w(r)
            }

            function i(t, n) {
              var e = f(n), r = t.params;
              r.host = e.hostname + ":" + e.port, r.pathname = e.pathname, t.sameOrigin = e.sameOrigin
            }

            function a(t, n) {
              t.params.status = n.status;
              var e = o(n, t.lastSize);
              if (e && (t.metrics.rxSize = e), t.sameOrigin) {
                var r = n.getResponseHeader("X-NewRelic-App-Data");
                r && (t.params.cat = r.split(", ").pop())
              }
              t.loadCaptureCalled = !0
            }

            var s = t("loader");
            if (s.xhrWrappable) {
              var c = t("handle"), f = t(12), u = t(10).generateTraceHeader,
                  d = t("ee"), l = ["load", "error", "abort", "timeout"], p = l.length,
                  h = t("id"), m = t(15), w = t(14), v = window.XMLHttpRequest;
              s.features.xhr = !0, t(9), d.on("new-xhr", function (t) {
                var n = this;
                n.totalCbs = 0, n.called = 0, n.cbTime = 0, n.end = r, n.ended = !1, n.xhrGuids = {}, n.lastSize = null, n.loadCaptureCalled = !1, t.addEventListener("load", function (e) {
                  a(n, t)
                }, !1), m && (m > 34 || m < 10) || window.opera || t.addEventListener("progress", function (t) {
                  n.lastSize = t.loaded
                }, !1)
              }), d.on("open-xhr-start", function (t) {
                this.params = {method: t[0]}, i(this, t[1]), this.metrics = {}
              }), d.on("open-xhr-end", function (t, n) {
                "loader_config" in NREUM && "xpid" in NREUM.loader_config && this.sameOrigin && n.setRequestHeader("X-NewRelic-ID", NREUM.loader_config.xpid);
                var e = !1;
                if ("init" in NREUM && "distributed_tracing" in NREUM.init && (e = !!NREUM.init.distributed_tracing.enabled), e && this.sameOrigin) {
                  var r = u();
                  r && n.setRequestHeader("newrelic", r)
                }
              }), d.on("send-xhr-start", function (t, n) {
                var e = this.metrics, r = t[0], o = this;
                if (e && r) {
                  var i = w(r);
                  i && (e.txSize = i)
                }
                this.startTime = s.now(), this.listener = function (t) {
                  try {
                    "abort" !== t.type || o.loadCaptureCalled || (o.params.aborted = !0), ("load" !== t.type || o.called === o.totalCbs && (o.onloadCalled || "function" != typeof n.onload)) && o.end(n)
                  }
                  catch (e) {
                    try {
                      d.emit("internal-error", [e])
                    }
                    catch (r) {
                    }
                  }
                };
                for (var a = 0; a < p; a++) {
                  n.addEventListener(l[a], this.listener, !1)
                }
              }), d.on("xhr-cb-time", function (t, n, e) {
                this.cbTime += t, n ? this.onloadCalled = !0 : this.called += 1, this.called !== this.totalCbs || !this.onloadCalled && "function" == typeof e.onload || this.end(e)
              }), d.on("xhr-load-added", function (t, n) {
                var e = "" + h(t) + !!n;
                this.xhrGuids && !this.xhrGuids[e] && (this.xhrGuids[e] = !0, this.totalCbs += 1)
              }), d.on("xhr-load-removed", function (t, n) {
                var e = "" + h(t) + !!n;
                this.xhrGuids && this.xhrGuids[e] && (delete this.xhrGuids[e], this.totalCbs -= 1)
              }), d.on("addEventListener-end", function (t, n) {
                n instanceof v && "load" === t[0] && d.emit("xhr-load-added", [t[1], t[2]], n)
              }), d.on("removeEventListener-end", function (t, n) {
                n instanceof v && "load" === t[0] && d.emit("xhr-load-removed", [t[1], t[2]], n)
              }), d.on("fn-start", function (t, n, e) {
                n instanceof v && ("onload" === e && (this.onload = !0), ("load" === (t[0] && t[0].type) || this.onload) && (this.xhrCbStart = s.now()))
              }), d.on("fn-end", function (t, n) {
                this.xhrCbStart && d.emit("xhr-cb-time", [s.now() - this.xhrCbStart, this.onload, n], n)
              })
            }
          }, {}], 12: [function (t, n, e) {
            n.exports = function (t) {
              var n = document.createElement("a"), e = window.location, r = {};
              n.href = t, r.port = n.port;
              var o = n.href.split("://");
              !r.port && o[1] && (r.port = o[1].split("/")[0].split("@").pop().split(":")[1]), r.port && "0" !== r.port || (r.port = "https" === o[0] ? "443" : "80"), r.hostname = n.hostname || e.hostname, r.pathname = n.pathname, r.protocol = o[0], "/" !== r.pathname.charAt(0) && (r.pathname = "/" + r.pathname);
              var i = !n.protocol || ":" === n.protocol || n.protocol === e.protocol,
                  a = n.hostname === document.domain && n.port === e.port;
              return r.sameOrigin = i && (!n.hostname || a), r
            }
          }, {}], 13: [function (t, n, e) {
            function r() {
            }

            function o(t, n, e) {
              return function () {
                return i(t, [f.now()].concat(s(arguments)), n ? null : this, e), n ? void 0 : this
              }
            }

            var i = t("handle"), a = t(18), s = t(19), c = t("ee").get("tracer"),
                f = t("loader"), u = NREUM;
            "undefined" == typeof window.newrelic && (newrelic = u);
            var d = ["setPageViewName", "setCustomAttribute", "setErrorHandler", "finished", "addToTrace", "inlineHit", "addRelease"],
                l = "api-", p = l + "ixn-";
            a(d, function (t, n) {
              u[n] = o(l + n, !0, "api")
            }), u.addPageAction = o(l + "addPageAction", !0), u.setCurrentRouteName = o(l + "routeName", !0), n.exports = newrelic, u.interaction = function () {
              return (new r).get()
            };
            var h = r.prototype = {
              createTracer: function (t, n) {
                var e = {}, r = this, o = "function" == typeof n;
                return i(p + "tracer", [f.now(), t, e], r), function () {
                  if (c.emit((o ? "" : "no-") + "fn-start", [f.now(), r, o], e), o) {
                    try {
                      return n.apply(this, arguments)
                    }
                    catch (t) {
                      throw c.emit("fn-err", [arguments, this, t], e), t
                    }
                    finally {
                      c.emit("fn-end", [f.now()], e)
                    }
                  }
                }
              }
            };
            a("actionText,setName,setAttribute,save,ignore,onEnd,getContext,end,get".split(","), function (t, n) {
              h[n] = o(p + n)
            }), newrelic.noticeError = function (t, n) {
              "string" == typeof t && (t = new Error(t)), i("err", [t, f.now(), !1, n])
            }
          }, {}], 14: [function (t, n, e) {
            n.exports = function (t) {
              if ("string" == typeof t && t.length) {
                return t.length;
              }
              if ("object" == typeof t) {
                if ("undefined" != typeof ArrayBuffer && t instanceof ArrayBuffer && t.byteLength) {
                  return t.byteLength;
                }
                if ("undefined" != typeof Blob && t instanceof Blob && t.size) {
                  return t.size;
                }
                if (!("undefined" != typeof FormData && t instanceof FormData)) {
                  try {
                    return JSON.stringify(t).length
                  }
                  catch (n) {
                    return
                  }
                }
              }
            }
          }, {}], 15: [function (t, n, e) {
            var r = 0, o = navigator.userAgent.match(/Firefox[\/\s](\d+\.\d+)/);
            o && (r = +o[1]), n.exports = r
          }, {}], 16: [function (t, n, e) {
            function r() {
              function t() {
                return n ? 15 & n[e++] : 16 * Math.random() | 0
              }

              var n = null, e = 0, r = window.crypto || window.msCrypto;
              r && r.getRandomValues && (n = r.getRandomValues(new Uint8Array(31)));
              for (var o, i = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx", a = "", s = 0; s < i.length; s++) {
                o = i[s], "x" === o ? a += t().toString(16) : "y" === o ? (o = 3 & t() | 8, a += o.toString(16)) : a += o;
              }
              return a
            }

            function o() {
              function t() {
                return n ? 15 & n[e++] : 16 * Math.random() | 0
              }

              var n = null, e = 0, r = window.crypto || window.msCrypto;
              r && r.getRandomValues && Uint8Array && (n = r.getRandomValues(new Uint8Array(31)));
              for (var o = [], i = 0; i < 16; i++) {
                o.push(t().toString(16));
              }
              return o.join("")
            }

            n.exports = {generateUuid: r, generateCatId: o}
          }, {}], 17: [function (t, n, e) {
            function r(t, n) {
              if (!o) {
                return !1;
              }
              if (t !== o) {
                return !1;
              }
              if (!n) {
                return !0;
              }
              if (!i) {
                return !1;
              }
              for (var e = i.split("."), r = n.split("."), a = 0; a < r.length; a++) {
                if (r[a] !== e[a]) {
                  return !1;
                }
              }
              return !0
            }

            var o = null, i = null, a = /Version\/(\S+)\s+Safari/;
            if (navigator.userAgent) {
              var s = navigator.userAgent, c = s.match(a);
              c && s.indexOf("Chrome") === -1 && s.indexOf("Chromium") === -1 && (o = "Safari", i = c[1])
            }
            n.exports = {agent: o, version: i, match: r}
          }, {}], 18: [function (t, n, e) {
            function r(t, n) {
              var e = [], r = "", i = 0;
              for (r in t) {
                o.call(t, r) && (e[i] = n(r, t[r]), i += 1);
              }
              return e
            }

            var o = Object.prototype.hasOwnProperty;
            n.exports = r
          }, {}], 19: [function (t, n, e) {
            function r(t, n, e) {
              n || (n = 0), "undefined" == typeof e && (e = t ? t.length : 0);
              for (var r = -1, o = e - n || 0, i = Array(o < 0 ? 0 : o); ++r < o;) {
                i[r] = t[n + r];
              }
              return i
            }

            n.exports = r
          }, {}], 20: [function (t, n, e) {
            n.exports = {exists: "undefined" != typeof window.performance && window.performance.timing && "undefined" != typeof window.performance.timing.navigationStart}
          }, {}], 21: [function (t, n, e) {
            function r(t) {
              return !(t && t instanceof Function && t.apply && !t[a])
            }

            var o = t("ee"), i = t(19), a = "nr@original",
                s = Object.prototype.hasOwnProperty, c = !1;
            n.exports = function (t, n) {
              function e(t, n, e, o) {
                function nrWrapper() {
                  var r, a, s, c;
                  try {
                    a = this, r = i(arguments), s = "function" == typeof e ? e(r, a) : e || {}
                  }
                  catch (f) {
                    l([f, "", [r, a, o], s])
                  }
                  u(n + "start", [r, a, o], s);
                  try {
                    return c = t.apply(a, r)
                  }
                  catch (d) {
                    throw u(n + "err", [r, a, d], s), d
                  }
                  finally {
                    u(n + "end", [r, a, c], s)
                  }
                }

                return r(t) ? t : (n || (n = ""), nrWrapper[a] = t, d(t, nrWrapper), nrWrapper)
              }

              function f(t, n, o, i) {
                o || (o = "");
                var a, s, c, f = "-" === o.charAt(0);
                for (c = 0; c < n.length; c++) {
                  s = n[c], a = t[s], r(a) || (t[s] = e(a, f ? s + o : o, i, s))
                }
              }

              function u(e, r, o) {
                if (!c || n) {
                  var i = c;
                  c = !0;
                  try {
                    t.emit(e, r, o, n)
                  }
                  catch (a) {
                    l([a, e, r, o])
                  }
                  c = i
                }
              }

              function d(t, n) {
                if (Object.defineProperty && Object.keys) {
                  try {
                    var e = Object.keys(t);
                    return e.forEach(function (e) {
                      Object.defineProperty(n, e, {
                        get: function () {
                          return t[e]
                        }, set: function (n) {
                          return t[e] = n, n
                        }
                      })
                    }), n
                  }
                  catch (r) {
                    l([r])
                  }
                }
                for (var o in t) {
                  s.call(t, o) && (n[o] = t[o]);
                }
                return n
              }

              function l(n) {
                try {
                  t.emit("internal-error", n)
                }
                catch (e) {
                }
              }

              return t || (t = o), e.inPlace = f, e.flag = a, e
            }
          }, {}], ee: [function (t, n, e) {
            function r() {
            }

            function o(t) {
              function n(t) {
                return t && t instanceof r ? t : t ? c(t, s, i) : i()
              }

              function e(e, r, o, i) {
                if (!l.aborted || i) {
                  t && t(e, r, o);
                  for (var a = n(o), s = m(e), c = s.length, f = 0; f < c; f++) {
                    s[f].apply(a, r);
                  }
                  var d = u[g[e]];
                  return d && d.push([x, e, r, a]), a
                }
              }

              function p(t, n) {
                y[t] = m(t).concat(n)
              }

              function h(t, n) {
                var e = y[t];
                if (e) {
                  for (var r = 0; r < e.length; r++) {
                    e[r] === n && e.splice(r, 1)
                  }
                }
              }

              function m(t) {
                return y[t] || []
              }

              function w(t) {
                return d[t] = d[t] || o(e)
              }

              function v(t, n) {
                f(t, function (t, e) {
                  n = n || "feature", g[e] = n, n in u || (u[n] = [])
                })
              }

              var y = {}, g = {}, x = {
                on: p,
                addEventListener: p,
                removeEventListener: h,
                emit: e,
                get: w,
                listeners: m,
                context: n,
                buffer: v,
                abort: a,
                aborted: !1
              };
              return x
            }

            function i() {
              return new r
            }

            function a() {
              (u.api || u.feature) && (l.aborted = !0, u = l.backlog = {})
            }

            var s = "nr@context", c = t("gos"), f = t(18), u = {}, d = {},
                l = n.exports = o();
            l.backlog = u
          }, {}], gos: [function (t, n, e) {
            function r(t, n, e) {
              if (o.call(t, n)) {
                return t[n];
              }
              var r = e();
              if (Object.defineProperty && Object.keys) {
                try {
                  return Object.defineProperty(t, n, {
                    value: r,
                    writable: !0,
                    enumerable: !1
                  }), r
                }
                catch (i) {
                }
              }
              return t[n] = r, r
            }

            var o = Object.prototype.hasOwnProperty;
            n.exports = r
          }, {}], handle: [function (t, n, e) {
            function r(t, n, e, r) {
              o.buffer([t], r), o.emit(t, n, e)
            }

            var o = t("ee").get("handle");
            n.exports = r, r.ee = o
          }, {}], id: [function (t, n, e) {
            function r(t) {
              var n = typeof t;
              return !t || "object" !== n && "function" !== n ? -1 : t === window ? 0 : a(t, i, function () {
                return o++
              })
            }

            var o = 1, i = "nr@id", a = t("gos");
            n.exports = r
          }, {}], loader: [function (t, n, e) {
            function r() {
              if (!E++) {
                var t = b.info = NREUM.info, n = p.getElementsByTagName("script")[0];
                if (setTimeout(u.abort, 3e4), !(t && t.licenseKey && t.applicationID && n)) {
                  return u.abort();
                }
                f(g, function (n, e) {
                  t[n] || (t[n] = e)
                }), c("mark", ["onload", a() + b.offset], null, "api");
                var e = p.createElement("script");
                e.src = "https://" + t.agent, n.parentNode.insertBefore(e, n)
              }
            }

            function o() {
              "complete" === p.readyState && i()
            }

            function i() {
              c("mark", ["domContent", a() + b.offset], null, "api")
            }

            function a() {
              return R.exists && performance.now ? Math.round(performance.now()) : (s = Math.max((new Date).getTime(), s)) - b.offset
            }

            var s = (new Date).getTime(), c = t("handle"), f = t(18), u = t("ee"),
                d = t(17), l = window, p = l.document, h = "addEventListener",
                m = "attachEvent", w = l.XMLHttpRequest, v = w && w.prototype;
            NREUM.o = {
              ST: setTimeout,
              SI: l.setImmediate,
              CT: clearTimeout,
              XHR: w,
              REQ: l.Request,
              EV: l.Event,
              PR: l.Promise,
              MO: l.MutationObserver
            };
            var y = "" + location, g = {
                  beacon: "bam.nr-data.net",
                  errorBeacon: "bam.nr-data.net",
                  agent: "js-agent.newrelic.com/nr-1130.min.js"
                }, x = w && v && v[h] && !/CriOS/.test(navigator.userAgent),
                b = n.exports = {
                  offset: s,
                  now: a,
                  origin: y,
                  features: {},
                  xhrWrappable: x,
                  userAgent: d
                };
            t(13), p[h] ? (p[h]("DOMContentLoaded", i, !1), l[h]("load", r, !1)) : (p[m]("onreadystatechange", o), l[m]("onload", r)), c("mark", ["firstbyte", s], null, "api");
            var E = 0, R = t(20)
          }, {}]
        }, {}, ["loader", 2, 11, 4, 3]);
        ;NREUM.info = {
          beacon: "bam.eu01.nr-data.net",
          errorBeacon: "bam.eu01.nr-data.net",
          licenseKey: "da4493c478",
          applicationID: "11145390",
          sa: 1
        }
        // End snippet.
      });
    }
  };
})(jQuery, Drupal, this);
;
/*! SmartMenus jQuery Plugin - v1.0.1 - November 1, 2016
 * http://www.smartmenus.org/
 * Copyright Vasil Dinkov, Vadikom Web Ltd. http://vadikom.com; Licensed MIT */(function(t){"function"==typeof define&&define.amd?define(["jquery"],t):"object"==typeof module&&"object"==typeof module.exports?module.exports=t(require("jquery")):t(jQuery)})(function($){function initMouseDetection(t){var e=".smartmenus_mouse";if(mouseDetectionEnabled||t)mouseDetectionEnabled&&t&&($(document).unbind(e),mouseDetectionEnabled=!1);else{var i=!0,s=null;$(document).bind(getEventsNS([["mousemove",function(t){var e={x:t.pageX,y:t.pageY,timeStamp:(new Date).getTime()};if(s){var o=Math.abs(s.x-e.x),a=Math.abs(s.y-e.y);if((o>0||a>0)&&2>=o&&2>=a&&300>=e.timeStamp-s.timeStamp&&(mouse=!0,i)){var n=$(t.target).closest("a");n.is("a")&&$.each(menuTrees,function(){return $.contains(this.$root[0],n[0])?(this.itemEnter({currentTarget:n[0]}),!1):void 0}),i=!1}}s=e}],[touchEvents?"touchstart":"pointerover pointermove pointerout MSPointerOver MSPointerMove MSPointerOut",function(t){isTouchEvent(t.originalEvent)&&(mouse=!1)}]],e)),mouseDetectionEnabled=!0}}function isTouchEvent(t){return!/^(4|mouse)$/.test(t.pointerType)}function getEventsNS(t,e){e||(e="");var i={};return $.each(t,function(t,s){i[s[0].split(" ").join(e+" ")+e]=s[1]}),i}var menuTrees=[],IE=!!window.createPopup,mouse=!1,touchEvents="ontouchstart"in window,mouseDetectionEnabled=!1,requestAnimationFrame=window.requestAnimationFrame||function(t){return setTimeout(t,1e3/60)},cancelAnimationFrame=window.cancelAnimationFrame||function(t){clearTimeout(t)};return $.SmartMenus=function(t,e){this.$root=$(t),this.opts=e,this.rootId="",this.accessIdPrefix="",this.$subArrow=null,this.activatedItems=[],this.visibleSubMenus=[],this.showTimeout=0,this.hideTimeout=0,this.scrollTimeout=0,this.clickActivated=!1,this.focusActivated=!1,this.zIndexInc=0,this.idInc=0,this.$firstLink=null,this.$firstSub=null,this.disabled=!1,this.$disableOverlay=null,this.$touchScrollingSub=null,this.cssTransforms3d="perspective"in t.style||"webkitPerspective"in t.style,this.wasCollapsible=!1,this.init()},$.extend($.SmartMenus,{hideAll:function(){$.each(menuTrees,function(){this.menuHideAll()})},destroy:function(){for(;menuTrees.length;)menuTrees[0].destroy();initMouseDetection(!0)},prototype:{init:function(t){var e=this;if(!t){menuTrees.push(this),this.rootId=((new Date).getTime()+Math.random()+"").replace(/\D/g,""),this.accessIdPrefix="sm-"+this.rootId+"-",this.$root.hasClass("sm-rtl")&&(this.opts.rightToLeftSubMenus=!0);var i=".smartmenus";this.$root.data("smartmenus",this).attr("data-smartmenus-id",this.rootId).dataSM("level",1).bind(getEventsNS([["mouseover focusin",$.proxy(this.rootOver,this)],["mouseout focusout",$.proxy(this.rootOut,this)],["keydown",$.proxy(this.rootKeyDown,this)]],i)).delegate("a",getEventsNS([["mouseenter",$.proxy(this.itemEnter,this)],["mouseleave",$.proxy(this.itemLeave,this)],["mousedown",$.proxy(this.itemDown,this)],["focus",$.proxy(this.itemFocus,this)],["blur",$.proxy(this.itemBlur,this)],["click",$.proxy(this.itemClick,this)]],i)),i+=this.rootId,this.opts.hideOnClick&&$(document).bind(getEventsNS([["touchstart",$.proxy(this.docTouchStart,this)],["touchmove",$.proxy(this.docTouchMove,this)],["touchend",$.proxy(this.docTouchEnd,this)],["click",$.proxy(this.docClick,this)]],i)),$(window).bind(getEventsNS([["resize orientationchange",$.proxy(this.winResize,this)]],i)),this.opts.subIndicators&&(this.$subArrow=$("<span/>").addClass("sub-arrow"),this.opts.subIndicatorsText&&this.$subArrow.html(this.opts.subIndicatorsText)),initMouseDetection()}if(this.$firstSub=this.$root.find("ul").each(function(){e.menuInit($(this))}).eq(0),this.$firstLink=this.$root.find("a").eq(0),this.opts.markCurrentItem){var s=/(index|default)\.[^#\?\/]*/i,o=/#.*/,a=window.location.href.replace(s,""),n=a.replace(o,"");this.$root.find("a").each(function(){var t=this.href.replace(s,""),i=$(this);(t==a||t==n)&&(i.addClass("current"),e.opts.markCurrentTree&&i.parentsUntil("[data-smartmenus-id]","ul").each(function(){$(this).dataSM("parent-a").addClass("current")}))})}this.wasCollapsible=this.isCollapsible()},destroy:function(t){if(!t){var e=".smartmenus";this.$root.removeData("smartmenus").removeAttr("data-smartmenus-id").removeDataSM("level").unbind(e).undelegate(e),e+=this.rootId,$(document).unbind(e),$(window).unbind(e),this.opts.subIndicators&&(this.$subArrow=null)}this.menuHideAll();var i=this;this.$root.find("ul").each(function(){var t=$(this);t.dataSM("scroll-arrows")&&t.dataSM("scroll-arrows").remove(),t.dataSM("shown-before")&&((i.opts.subMenusMinWidth||i.opts.subMenusMaxWidth)&&t.css({width:"",minWidth:"",maxWidth:""}).removeClass("sm-nowrap"),t.dataSM("scroll-arrows")&&t.dataSM("scroll-arrows").remove(),t.css({zIndex:"",top:"",left:"",marginLeft:"",marginTop:"",display:""})),0==(t.attr("id")||"").indexOf(i.accessIdPrefix)&&t.removeAttr("id")}).removeDataSM("in-mega").removeDataSM("shown-before").removeDataSM("ie-shim").removeDataSM("scroll-arrows").removeDataSM("parent-a").removeDataSM("level").removeDataSM("beforefirstshowfired").removeAttr("role").removeAttr("aria-hidden").removeAttr("aria-labelledby").removeAttr("aria-expanded"),this.$root.find("a.has-submenu").each(function(){var t=$(this);0==t.attr("id").indexOf(i.accessIdPrefix)&&t.removeAttr("id")}).removeClass("has-submenu").removeDataSM("sub").removeAttr("aria-haspopup").removeAttr("aria-controls").removeAttr("aria-expanded").closest("li").removeDataSM("sub"),this.opts.subIndicators&&this.$root.find("span.sub-arrow").remove(),this.opts.markCurrentItem&&this.$root.find("a.current").removeClass("current"),t||(this.$root=null,this.$firstLink=null,this.$firstSub=null,this.$disableOverlay&&(this.$disableOverlay.remove(),this.$disableOverlay=null),menuTrees.splice($.inArray(this,menuTrees),1))},disable:function(t){if(!this.disabled){if(this.menuHideAll(),!t&&!this.opts.isPopup&&this.$root.is(":visible")){var e=this.$root.offset();this.$disableOverlay=$('<div class="sm-jquery-disable-overlay"/>').css({position:"absolute",top:e.top,left:e.left,width:this.$root.outerWidth(),height:this.$root.outerHeight(),zIndex:this.getStartZIndex(!0),opacity:0}).appendTo(document.body)}this.disabled=!0}},docClick:function(t){return this.$touchScrollingSub?(this.$touchScrollingSub=null,void 0):((this.visibleSubMenus.length&&!$.contains(this.$root[0],t.target)||$(t.target).is("a"))&&this.menuHideAll(),void 0)},docTouchEnd:function(){if(this.lastTouch){if(!(!this.visibleSubMenus.length||void 0!==this.lastTouch.x2&&this.lastTouch.x1!=this.lastTouch.x2||void 0!==this.lastTouch.y2&&this.lastTouch.y1!=this.lastTouch.y2||this.lastTouch.target&&$.contains(this.$root[0],this.lastTouch.target))){this.hideTimeout&&(clearTimeout(this.hideTimeout),this.hideTimeout=0);var t=this;this.hideTimeout=setTimeout(function(){t.menuHideAll()},350)}this.lastTouch=null}},docTouchMove:function(t){if(this.lastTouch){var e=t.originalEvent.touches[0];this.lastTouch.x2=e.pageX,this.lastTouch.y2=e.pageY}},docTouchStart:function(t){var e=t.originalEvent.touches[0];this.lastTouch={x1:e.pageX,y1:e.pageY,target:e.target}},enable:function(){this.disabled&&(this.$disableOverlay&&(this.$disableOverlay.remove(),this.$disableOverlay=null),this.disabled=!1)},getClosestMenu:function(t){for(var e=$(t).closest("ul");e.dataSM("in-mega");)e=e.parent().closest("ul");return e[0]||null},getHeight:function(t){return this.getOffset(t,!0)},getOffset:function(t,e){var i;"none"==t.css("display")&&(i={position:t[0].style.position,visibility:t[0].style.visibility},t.css({position:"absolute",visibility:"hidden"}).show());var s=t[0].getBoundingClientRect&&t[0].getBoundingClientRect(),o=s&&(e?s.height||s.bottom-s.top:s.width||s.right-s.left);return o||0===o||(o=e?t[0].offsetHeight:t[0].offsetWidth),i&&t.hide().css(i),o},getStartZIndex:function(t){var e=parseInt(this[t?"$root":"$firstSub"].css("z-index"));return!t&&isNaN(e)&&(e=parseInt(this.$root.css("z-index"))),isNaN(e)?1:e},getTouchPoint:function(t){return t.touches&&t.touches[0]||t.changedTouches&&t.changedTouches[0]||t},getViewport:function(t){var e=t?"Height":"Width",i=document.documentElement["client"+e],s=window["inner"+e];return s&&(i=Math.min(i,s)),i},getViewportHeight:function(){return this.getViewport(!0)},getViewportWidth:function(){return this.getViewport()},getWidth:function(t){return this.getOffset(t)},handleEvents:function(){return!this.disabled&&this.isCSSOn()},handleItemEvents:function(t){return this.handleEvents()&&!this.isLinkInMegaMenu(t)},isCollapsible:function(){return"static"==this.$firstSub.css("position")},isCSSOn:function(){return"block"==this.$firstLink.css("display")},isFixed:function(){var t="fixed"==this.$root.css("position");return t||this.$root.parentsUntil("body").each(function(){return"fixed"==$(this).css("position")?(t=!0,!1):void 0}),t},isLinkInMegaMenu:function(t){return $(this.getClosestMenu(t[0])).hasClass("mega-menu")},isTouchMode:function(){return!mouse||this.opts.noMouseOver||this.isCollapsible()},itemActivate:function(t,e){var i=t.closest("ul"),s=i.dataSM("level");if(s>1&&(!this.activatedItems[s-2]||this.activatedItems[s-2][0]!=i.dataSM("parent-a")[0])){var o=this;$(i.parentsUntil("[data-smartmenus-id]","ul").get().reverse()).add(i).each(function(){o.itemActivate($(this).dataSM("parent-a"))})}if((!this.isCollapsible()||e)&&this.menuHideSubMenus(this.activatedItems[s-1]&&this.activatedItems[s-1][0]==t[0]?s:s-1),this.activatedItems[s-1]=t,this.$root.triggerHandler("activate.smapi",t[0])!==!1){var a=t.dataSM("sub");a&&(this.isTouchMode()||!this.opts.showOnClick||this.clickActivated)&&this.menuShow(a)}},itemBlur:function(t){var e=$(t.currentTarget);this.handleItemEvents(e)&&this.$root.triggerHandler("blur.smapi",e[0])},itemClick:function(t){var e=$(t.currentTarget);if(this.handleItemEvents(e)){if(this.$touchScrollingSub&&this.$touchScrollingSub[0]==e.closest("ul")[0])return this.$touchScrollingSub=null,t.stopPropagation(),!1;if(this.$root.triggerHandler("click.smapi",e[0])===!1)return!1;var i=$(t.target).is("span.sub-arrow"),s=e.dataSM("sub"),o=s?2==s.dataSM("level"):!1;if(s&&!s.is(":visible")){if(this.opts.showOnClick&&o&&(this.clickActivated=!0),this.itemActivate(e),s.is(":visible"))return this.focusActivated=!0,!1}else if(this.isCollapsible()&&i)return this.itemActivate(e),this.menuHide(s),!1;return this.opts.showOnClick&&o||e.hasClass("disabled")||this.$root.triggerHandler("select.smapi",e[0])===!1?!1:void 0}},itemDown:function(t){var e=$(t.currentTarget);this.handleItemEvents(e)&&e.dataSM("mousedown",!0)},itemEnter:function(t){var e=$(t.currentTarget);if(this.handleItemEvents(e)){if(!this.isTouchMode()){this.showTimeout&&(clearTimeout(this.showTimeout),this.showTimeout=0);var i=this;this.showTimeout=setTimeout(function(){i.itemActivate(e)},this.opts.showOnClick&&1==e.closest("ul").dataSM("level")?1:this.opts.showTimeout)}this.$root.triggerHandler("mouseenter.smapi",e[0])}},itemFocus:function(t){var e=$(t.currentTarget);this.handleItemEvents(e)&&(!this.focusActivated||this.isTouchMode()&&e.dataSM("mousedown")||this.activatedItems.length&&this.activatedItems[this.activatedItems.length-1][0]==e[0]||this.itemActivate(e,!0),this.$root.triggerHandler("focus.smapi",e[0]))},itemLeave:function(t){var e=$(t.currentTarget);this.handleItemEvents(e)&&(this.isTouchMode()||(e[0].blur(),this.showTimeout&&(clearTimeout(this.showTimeout),this.showTimeout=0)),e.removeDataSM("mousedown"),this.$root.triggerHandler("mouseleave.smapi",e[0]))},menuHide:function(t){if(this.$root.triggerHandler("beforehide.smapi",t[0])!==!1&&(t.stop(!0,!0),"none"!=t.css("display"))){var e=function(){t.css("z-index","")};this.isCollapsible()?this.opts.collapsibleHideFunction?this.opts.collapsibleHideFunction.call(this,t,e):t.hide(this.opts.collapsibleHideDuration,e):this.opts.hideFunction?this.opts.hideFunction.call(this,t,e):t.hide(this.opts.hideDuration,e),t.dataSM("ie-shim")&&t.dataSM("ie-shim").remove().css({"-webkit-transform":"",transform:""}),t.dataSM("scroll")&&(this.menuScrollStop(t),t.css({"touch-action":"","-ms-touch-action":"","-webkit-transform":"",transform:""}).unbind(".smartmenus_scroll").removeDataSM("scroll").dataSM("scroll-arrows").hide()),t.dataSM("parent-a").removeClass("highlighted").attr("aria-expanded","false"),t.attr({"aria-expanded":"false","aria-hidden":"true"});var i=t.dataSM("level");this.activatedItems.splice(i-1,1),this.visibleSubMenus.splice($.inArray(t,this.visibleSubMenus),1),this.$root.triggerHandler("hide.smapi",t[0])}},menuHideAll:function(){this.showTimeout&&(clearTimeout(this.showTimeout),this.showTimeout=0);for(var t=this.opts.isPopup?1:0,e=this.visibleSubMenus.length-1;e>=t;e--)this.menuHide(this.visibleSubMenus[e]);this.opts.isPopup&&(this.$root.stop(!0,!0),this.$root.is(":visible")&&(this.opts.hideFunction?this.opts.hideFunction.call(this,this.$root):this.$root.hide(this.opts.hideDuration),this.$root.dataSM("ie-shim")&&this.$root.dataSM("ie-shim").remove())),this.activatedItems=[],this.visibleSubMenus=[],this.clickActivated=!1,this.focusActivated=!1,this.zIndexInc=0,this.$root.triggerHandler("hideAll.smapi")},menuHideSubMenus:function(t){for(var e=this.activatedItems.length-1;e>=t;e--){var i=this.activatedItems[e].dataSM("sub");i&&this.menuHide(i)}},menuIframeShim:function(t){IE&&this.opts.overlapControlsInIE&&!t.dataSM("ie-shim")&&t.dataSM("ie-shim",$("<iframe/>").attr({src:"javascript:0",tabindex:-9}).css({position:"absolute",top:"auto",left:"0",opacity:0,border:"0"}))},menuInit:function(t){if(!t.dataSM("in-mega")){t.hasClass("mega-menu")&&t.find("ul").dataSM("in-mega",!0);for(var e=2,i=t[0];(i=i.parentNode.parentNode)!=this.$root[0];)e++;var s=t.prevAll("a").eq(-1);s.length||(s=t.prevAll().find("a").eq(-1)),s.addClass("has-submenu").dataSM("sub",t),t.dataSM("parent-a",s).dataSM("level",e).parent().dataSM("sub",t);var o=s.attr("id")||this.accessIdPrefix+ ++this.idInc,a=t.attr("id")||this.accessIdPrefix+ ++this.idInc;s.attr({id:o,"aria-haspopup":"true","aria-controls":a,"aria-expanded":"false"}),t.attr({id:a,role:"group","aria-hidden":"true","aria-labelledby":o,"aria-expanded":"false"}),this.opts.subIndicators&&s[this.opts.subIndicatorsPos](this.$subArrow.clone())}},menuPosition:function(t){var e,i,s=t.dataSM("parent-a"),o=s.closest("li"),a=o.parent(),n=t.dataSM("level"),r=this.getWidth(t),h=this.getHeight(t),u=s.offset(),l=u.left,c=u.top,d=this.getWidth(s),m=this.getHeight(s),p=$(window),f=p.scrollLeft(),v=p.scrollTop(),S=this.getViewportWidth(),b=this.getViewportHeight(),g=a.parent().is("[data-sm-horizontal-sub]")||2==n&&!a.hasClass("sm-vertical"),M=this.opts.rightToLeftSubMenus&&!o.is("[data-sm-reverse]")||!this.opts.rightToLeftSubMenus&&o.is("[data-sm-reverse]"),w=2==n?this.opts.mainMenuSubOffsetX:this.opts.subMenusSubOffsetX,T=2==n?this.opts.mainMenuSubOffsetY:this.opts.subMenusSubOffsetY;if(g?(e=M?d-r-w:w,i=this.opts.bottomToTopSubMenus?-h-T:m+T):(e=M?w-r:d-w,i=this.opts.bottomToTopSubMenus?m-T-h:T),this.opts.keepInViewport){var y=l+e,I=c+i;if(M&&f>y?e=g?f-y+e:d-w:!M&&y+r>f+S&&(e=g?f+S-r-y+e:w-r),g||(b>h&&I+h>v+b?i+=v+b-h-I:(h>=b||v>I)&&(i+=v-I)),g&&(I+h>v+b+.49||v>I)||!g&&h>b+.49){var x=this;t.dataSM("scroll-arrows")||t.dataSM("scroll-arrows",$([$('<span class="scroll-up"><span class="scroll-up-arrow"></span></span>')[0],$('<span class="scroll-down"><span class="scroll-down-arrow"></span></span>')[0]]).bind({mouseenter:function(){t.dataSM("scroll").up=$(this).hasClass("scroll-up"),x.menuScroll(t)},mouseleave:function(e){x.menuScrollStop(t),x.menuScrollOut(t,e)},"mousewheel DOMMouseScroll":function(t){t.preventDefault()}}).insertAfter(t));var C=".smartmenus_scroll";t.dataSM("scroll",{y:this.cssTransforms3d?0:i-m,step:1,itemH:m,subH:h,arrowDownH:this.getHeight(t.dataSM("scroll-arrows").eq(1))}).bind(getEventsNS([["mouseover",function(e){x.menuScrollOver(t,e)}],["mouseout",function(e){x.menuScrollOut(t,e)}],["mousewheel DOMMouseScroll",function(e){x.menuScrollMousewheel(t,e)}]],C)).dataSM("scroll-arrows").css({top:"auto",left:"0",marginLeft:e+(parseInt(t.css("border-left-width"))||0),width:r-(parseInt(t.css("border-left-width"))||0)-(parseInt(t.css("border-right-width"))||0),zIndex:t.css("z-index")}).eq(g&&this.opts.bottomToTopSubMenus?0:1).show(),this.isFixed()&&t.css({"touch-action":"none","-ms-touch-action":"none"}).bind(getEventsNS([[touchEvents?"touchstart touchmove touchend":"pointerdown pointermove pointerup MSPointerDown MSPointerMove MSPointerUp",function(e){x.menuScrollTouch(t,e)}]],C))}}t.css({top:"auto",left:"0",marginLeft:e,marginTop:i-m}),this.menuIframeShim(t),t.dataSM("ie-shim")&&t.dataSM("ie-shim").css({zIndex:t.css("z-index"),width:r,height:h,marginLeft:e,marginTop:i-m})},menuScroll:function(t,e,i){var s,o=t.dataSM("scroll"),a=t.dataSM("scroll-arrows"),n=o.up?o.upEnd:o.downEnd;if(!e&&o.momentum){if(o.momentum*=.92,s=o.momentum,.5>s)return this.menuScrollStop(t),void 0}else s=i||(e||!this.opts.scrollAccelerate?this.opts.scrollStep:Math.floor(o.step));var r=t.dataSM("level");if(this.activatedItems[r-1]&&this.activatedItems[r-1].dataSM("sub")&&this.activatedItems[r-1].dataSM("sub").is(":visible")&&this.menuHideSubMenus(r-1),o.y=o.up&&o.y>=n||!o.up&&n>=o.y?o.y:Math.abs(n-o.y)>s?o.y+(o.up?s:-s):n,t.add(t.dataSM("ie-shim")).css(this.cssTransforms3d?{"-webkit-transform":"translate3d(0, "+o.y+"px, 0)",transform:"translate3d(0, "+o.y+"px, 0)"}:{marginTop:o.y}),mouse&&(o.up&&o.y>o.downEnd||!o.up&&o.y<o.upEnd)&&a.eq(o.up?1:0).show(),o.y==n)mouse&&a.eq(o.up?0:1).hide(),this.menuScrollStop(t);else if(!e){this.opts.scrollAccelerate&&o.step<this.opts.scrollStep&&(o.step+=.2);var h=this;this.scrollTimeout=requestAnimationFrame(function(){h.menuScroll(t)})}},menuScrollMousewheel:function(t,e){if(this.getClosestMenu(e.target)==t[0]){e=e.originalEvent;var i=(e.wheelDelta||-e.detail)>0;t.dataSM("scroll-arrows").eq(i?0:1).is(":visible")&&(t.dataSM("scroll").up=i,this.menuScroll(t,!0))}e.preventDefault()},menuScrollOut:function(t,e){mouse&&(/^scroll-(up|down)/.test((e.relatedTarget||"").className)||(t[0]==e.relatedTarget||$.contains(t[0],e.relatedTarget))&&this.getClosestMenu(e.relatedTarget)==t[0]||t.dataSM("scroll-arrows").css("visibility","hidden"))},menuScrollOver:function(t,e){if(mouse&&!/^scroll-(up|down)/.test(e.target.className)&&this.getClosestMenu(e.target)==t[0]){this.menuScrollRefreshData(t);var i=t.dataSM("scroll"),s=$(window).scrollTop()-t.dataSM("parent-a").offset().top-i.itemH;t.dataSM("scroll-arrows").eq(0).css("margin-top",s).end().eq(1).css("margin-top",s+this.getViewportHeight()-i.arrowDownH).end().css("visibility","visible")}},menuScrollRefreshData:function(t){var e=t.dataSM("scroll"),i=$(window).scrollTop()-t.dataSM("parent-a").offset().top-e.itemH;this.cssTransforms3d&&(i=-(parseFloat(t.css("margin-top"))-i)),$.extend(e,{upEnd:i,downEnd:i+this.getViewportHeight()-e.subH})},menuScrollStop:function(t){return this.scrollTimeout?(cancelAnimationFrame(this.scrollTimeout),this.scrollTimeout=0,t.dataSM("scroll").step=1,!0):void 0},menuScrollTouch:function(t,e){if(e=e.originalEvent,isTouchEvent(e)){var i=this.getTouchPoint(e);if(this.getClosestMenu(i.target)==t[0]){var s=t.dataSM("scroll");if(/(start|down)$/i.test(e.type))this.menuScrollStop(t)?(e.preventDefault(),this.$touchScrollingSub=t):this.$touchScrollingSub=null,this.menuScrollRefreshData(t),$.extend(s,{touchStartY:i.pageY,touchStartTime:e.timeStamp});else if(/move$/i.test(e.type)){var o=void 0!==s.touchY?s.touchY:s.touchStartY;if(void 0!==o&&o!=i.pageY){this.$touchScrollingSub=t;var a=i.pageY>o;void 0!==s.up&&s.up!=a&&$.extend(s,{touchStartY:i.pageY,touchStartTime:e.timeStamp}),$.extend(s,{up:a,touchY:i.pageY}),this.menuScroll(t,!0,Math.abs(i.pageY-o))}e.preventDefault()}else void 0!==s.touchY&&((s.momentum=15*Math.pow(Math.abs(i.pageY-s.touchStartY)/(e.timeStamp-s.touchStartTime),2))&&(this.menuScrollStop(t),this.menuScroll(t),e.preventDefault()),delete s.touchY)}}},menuShow:function(t){if((t.dataSM("beforefirstshowfired")||(t.dataSM("beforefirstshowfired",!0),this.$root.triggerHandler("beforefirstshow.smapi",t[0])!==!1))&&this.$root.triggerHandler("beforeshow.smapi",t[0])!==!1&&(t.dataSM("shown-before",!0).stop(!0,!0),!t.is(":visible"))){var e=t.dataSM("parent-a");if((this.opts.keepHighlighted||this.isCollapsible())&&e.addClass("highlighted"),this.isCollapsible())t.removeClass("sm-nowrap").css({zIndex:"",width:"auto",minWidth:"",maxWidth:"",top:"",left:"",marginLeft:"",marginTop:""});else{if(t.css("z-index",this.zIndexInc=(this.zIndexInc||this.getStartZIndex())+1),(this.opts.subMenusMinWidth||this.opts.subMenusMaxWidth)&&(t.css({width:"auto",minWidth:"",maxWidth:""}).addClass("sm-nowrap"),this.opts.subMenusMinWidth&&t.css("min-width",this.opts.subMenusMinWidth),this.opts.subMenusMaxWidth)){var i=this.getWidth(t);t.css("max-width",this.opts.subMenusMaxWidth),i>this.getWidth(t)&&t.removeClass("sm-nowrap").css("width",this.opts.subMenusMaxWidth)}this.menuPosition(t),t.dataSM("ie-shim")&&t.dataSM("ie-shim").insertBefore(t)}var s=function(){t.css("overflow","")};this.isCollapsible()?this.opts.collapsibleShowFunction?this.opts.collapsibleShowFunction.call(this,t,s):t.show(this.opts.collapsibleShowDuration,s):this.opts.showFunction?this.opts.showFunction.call(this,t,s):t.show(this.opts.showDuration,s),e.attr("aria-expanded","true"),t.attr({"aria-expanded":"true","aria-hidden":"false"}),this.visibleSubMenus.push(t),this.$root.triggerHandler("show.smapi",t[0])}},popupHide:function(t){this.hideTimeout&&(clearTimeout(this.hideTimeout),this.hideTimeout=0);var e=this;this.hideTimeout=setTimeout(function(){e.menuHideAll()},t?1:this.opts.hideTimeout)},popupShow:function(t,e){if(!this.opts.isPopup)return alert('SmartMenus jQuery Error:\n\nIf you want to show this menu via the "popupShow" method, set the isPopup:true option.'),void 0;if(this.hideTimeout&&(clearTimeout(this.hideTimeout),this.hideTimeout=0),this.$root.dataSM("shown-before",!0).stop(!0,!0),!this.$root.is(":visible")){this.$root.css({left:t,top:e}),this.menuIframeShim(this.$root),this.$root.dataSM("ie-shim")&&this.$root.dataSM("ie-shim").css({zIndex:this.$root.css("z-index"),width:this.getWidth(this.$root),height:this.getHeight(this.$root),left:t,top:e}).insertBefore(this.$root);var i=this,s=function(){i.$root.css("overflow","")};this.opts.showFunction?this.opts.showFunction.call(this,this.$root,s):this.$root.show(this.opts.showDuration,s),this.visibleSubMenus[0]=this.$root}},refresh:function(){this.destroy(!0),this.init(!0)},rootKeyDown:function(t){if(this.handleEvents())switch(t.keyCode){case 27:var e=this.activatedItems[0];if(e){this.menuHideAll(),e[0].focus();var i=e.dataSM("sub");i&&this.menuHide(i)}break;case 32:var s=$(t.target);if(s.is("a")&&this.handleItemEvents(s)){var i=s.dataSM("sub");i&&!i.is(":visible")&&(this.itemClick({currentTarget:t.target}),t.preventDefault())}}},rootOut:function(t){if(this.handleEvents()&&!this.isTouchMode()&&t.target!=this.$root[0]&&(this.hideTimeout&&(clearTimeout(this.hideTimeout),this.hideTimeout=0),!this.opts.showOnClick||!this.opts.hideOnClick)){var e=this;this.hideTimeout=setTimeout(function(){e.menuHideAll()},this.opts.hideTimeout)}},rootOver:function(t){this.handleEvents()&&!this.isTouchMode()&&t.target!=this.$root[0]&&this.hideTimeout&&(clearTimeout(this.hideTimeout),this.hideTimeout=0)},winResize:function(t){if(this.handleEvents()){if(!("onorientationchange"in window)||"orientationchange"==t.type){var e=this.isCollapsible();this.wasCollapsible&&e||(this.activatedItems.length&&this.activatedItems[this.activatedItems.length-1][0].blur(),this.menuHideAll()),this.wasCollapsible=e}}else if(this.$disableOverlay){var i=this.$root.offset();this.$disableOverlay.css({top:i.top,left:i.left,width:this.$root.outerWidth(),height:this.$root.outerHeight()})}}}}),$.fn.dataSM=function(t,e){return e?this.data(t+"_smartmenus",e):this.data(t+"_smartmenus")},$.fn.removeDataSM=function(t){return this.removeData(t+"_smartmenus")},$.fn.smartmenus=function(options){if("string"==typeof options){var args=arguments,method=options;return Array.prototype.shift.call(args),this.each(function(){var t=$(this).data("smartmenus");t&&t[method]&&t[method].apply(t,args)})}var dataOpts=this.data("sm-options")||null;if(dataOpts)try{dataOpts=eval("("+dataOpts+")")}catch(e){dataOpts=null,alert('ERROR\n\nSmartMenus jQuery init:\nInvalid "data-sm-options" attribute value syntax.')}return this.each(function(){new $.SmartMenus(this,$.extend({},$.fn.smartmenus.defaults,options,dataOpts))})},$.fn.smartmenus.defaults={isPopup:!1,mainMenuSubOffsetX:0,mainMenuSubOffsetY:0,subMenusSubOffsetX:0,subMenusSubOffsetY:0,subMenusMinWidth:"10em",subMenusMaxWidth:"20em",subIndicators:!0,subIndicatorsPos:"prepend",subIndicatorsText:"+",scrollStep:30,scrollAccelerate:!0,showTimeout:250,hideTimeout:500,showDuration:0,showFunction:null,hideDuration:0,hideFunction:function(t,e){t.fadeOut(200,e)},collapsibleShowDuration:0,collapsibleShowFunction:function(t,e){t.slideDown(200,e)},collapsibleHideDuration:0,collapsibleHideFunction:function(t,e){t.slideUp(200,e)},showOnClick:!1,hideOnClick:!0,noMouseOver:!1,keepInViewport:!0,keepHighlighted:!0,markCurrentItem:!1,markCurrentTree:!0,rightToLeftSubMenus:!1,bottomToTopSubMenus:!1,overlapControlsInIE:!0},$});;
/*! SmartMenus jQuery Plugin Bootstrap Addon - v0.3.1 - November 1, 2016
 * http://www.smartmenus.org/
 * Copyright Vasil Dinkov, Vadikom Web Ltd. http://vadikom.com; Licensed MIT */(function(t){"function"==typeof define&&define.amd?define(["jquery","jquery.smartmenus"],t):"object"==typeof module&&"object"==typeof module.exports?module.exports=t(require("jquery")):t(jQuery)})(function(t){return t.extend(t.SmartMenus.Bootstrap={},{keydownFix:!1,init:function(){var e=t("ul.navbar-nav:not([data-sm-skip])");e.each(function(){function e(){o.find("a.current").parent().addClass("active"),o.find("a.has-submenu").each(function(){var e=t(this);e.is('[data-toggle="dropdown"]')&&e.dataSM("bs-data-toggle-dropdown",!0).removeAttr("data-toggle"),e.is('[role="button"]')&&e.dataSM("bs-role-button",!0).removeAttr("role")})}function s(){o.find("a.current").parent().removeClass("active"),o.find("a.has-submenu").each(function(){var e=t(this);e.dataSM("bs-data-toggle-dropdown")&&e.attr("data-toggle","dropdown").removeDataSM("bs-data-toggle-dropdown"),e.dataSM("bs-role-button")&&e.attr("role","button").removeDataSM("bs-role-button")})}function i(t){var e=a.getViewportWidth();if(e!=n||t){var s=o.find(".caret");a.isCollapsible()?(o.addClass("sm-collapsible"),o.is("[data-sm-skip-collapsible-behavior]")||s.addClass("navbar-toggle sub-arrow")):(o.removeClass("sm-collapsible"),o.is("[data-sm-skip-collapsible-behavior]")||s.removeClass("navbar-toggle sub-arrow")),n=e}}var o=t(this),a=o.data("smartmenus");if(!a){o.smartmenus({subMenusSubOffsetX:2,subMenusSubOffsetY:-6,subIndicators:!1,collapsibleShowFunction:null,collapsibleHideFunction:null,rightToLeftSubMenus:o.hasClass("navbar-right"),bottomToTopSubMenus:o.closest(".navbar").hasClass("navbar-fixed-bottom")}).bind({"show.smapi":function(e,s){var i=t(s),o=i.dataSM("scroll-arrows");o&&o.css("background-color",t(document.body).css("background-color")),i.parent().addClass("open")},"hide.smapi":function(e,s){t(s).parent().removeClass("open")}}),e(),a=o.data("smartmenus"),a.isCollapsible=function(){return!/^(left|right)$/.test(this.$firstLink.parent().css("float"))},a.refresh=function(){t.SmartMenus.prototype.refresh.call(this),e(),i(!0)},a.destroy=function(e){s(),t.SmartMenus.prototype.destroy.call(this,e)},o.is("[data-sm-skip-collapsible-behavior]")&&o.bind({"click.smapi":function(e,s){if(a.isCollapsible()){var i=t(s),o=i.parent().dataSM("sub");if(o&&o.dataSM("shown-before")&&o.is(":visible"))return a.itemActivate(i),a.menuHide(o),!1}}});var n;i(),t(window).bind("resize.smartmenus"+a.rootId,i)}}),e.length&&!t.SmartMenus.Bootstrap.keydownFix&&(t(document).off("keydown.bs.dropdown.data-api",".dropdown-menu"),t.fn.dropdown&&t.fn.dropdown.Constructor&&t(document).on("keydown.bs.dropdown.data-api",'.dropdown-menu:not([id^="sm-"])',t.fn.dropdown.Constructor.prototype.keydown),t.SmartMenus.Bootstrap.keydownFix=!0)}}),t(t.SmartMenus.Bootstrap.init),t});;
/*!
 * @preserve
 *
 * Readmore.js jQuery plugin
 * Author: @jed_foster
 * Project home: http://jedfoster.github.io/Readmore.js
 * Licensed under the MIT license
 *
 * Debounce function from http://davidwalsh.name/javascript-debounce-function
 */
!function(t){"function"==typeof define&&define.amd?define(["jquery"],t):"object"==typeof exports?module.exports=t(require("jquery")):t(jQuery)}(function(t){"use strict";function e(t,e,i){var o;return function(){var n=this,a=arguments,s=function(){o=null,i||t.apply(n,a)},r=i&&!o;clearTimeout(o),o=setTimeout(s,e),r&&t.apply(n,a)}}function i(t){var e=++h;return String(null==t?"rmjs-":t)+e}function o(t){var e=t.clone().css({height:"auto",width:t.width(),maxHeight:"none",overflow:"hidden"}).insertAfter(t),i=e.outerHeight(),o=parseInt(e.css({maxHeight:""}).css("max-height").replace(/[^-\d\.]/g,""),10),n=t.data("defaultHeight");e.remove();var a=o||t.data("collapsedHeight")||n;t.data({expandedHeight:i,maxHeight:o,collapsedHeight:a}).css({maxHeight:"none"})}function n(t){if(!d[t.selector]){var e=" ";t.embedCSS&&""!==t.blockCSS&&(e+=t.selector+" + [data-readmore-toggle], "+t.selector+"[data-readmore]{"+t.blockCSS+"}"),e+=t.selector+"[data-readmore]{transition: height "+t.speed+"ms;overflow: hidden;}",function(t,e){var i=t.createElement("style");i.type="text/css",i.styleSheet?i.styleSheet.cssText=e:i.appendChild(t.createTextNode(e)),t.getElementsByTagName("head")[0].appendChild(i)}(document,e),d[t.selector]=!0}}function a(e,i){this.element=e,this.options=t.extend({},r,i),n(this.options),this._defaults=r,this._name=s,this.init(),window.addEventListener?(window.addEventListener("load",c),window.addEventListener("resize",c)):(window.attachEvent("load",c),window.attachEvent("resize",c))}var s="readmore",r={speed:100,collapsedHeight:200,heightMargin:16,moreLink:'<a href="#">Read More</a>',lessLink:'<a href="#">Close</a>',embedCSS:!0,blockCSS:"display: block; width: 100%;",startOpen:!1,blockProcessed:function(){},beforeToggle:function(){},afterToggle:function(){}},d={},h=0,c=e(function(){t("[data-readmore]").each(function(){var e=t(this),i="true"===e.attr("aria-expanded");o(e),e.css({height:e.data(i?"expandedHeight":"collapsedHeight")})})},100);a.prototype={init:function(){var e=t(this.element);e.data({defaultHeight:this.options.collapsedHeight,heightMargin:this.options.heightMargin}),o(e);var n=e.data("collapsedHeight"),a=e.data("heightMargin");if(e.outerHeight(!0)<=n+a)return this.options.blockProcessed&&"function"==typeof this.options.blockProcessed&&this.options.blockProcessed(e,!1),!0;var s=e.attr("id")||i(),r=this.options.startOpen?this.options.lessLink:this.options.moreLink;e.attr({"data-readmore":"","aria-expanded":this.options.startOpen,id:s}),e.after(t(r).on("click",function(t){return function(i){t.toggle(this,e[0],i)}}(this)).attr({"data-readmore-toggle":s,"aria-controls":s})),this.options.startOpen||e.css({height:n}),this.options.blockProcessed&&"function"==typeof this.options.blockProcessed&&this.options.blockProcessed(e,!0)},toggle:function(e,i,o){o&&o.preventDefault(),e||(e=t('[aria-controls="'+this.element.id+'"]')[0]),i||(i=this.element);var n=t(i),a="",s="",r=!1,d=n.data("collapsedHeight");n.height()<=d?(a=n.data("expandedHeight")+"px",s="lessLink",r=!0):(a=d,s="moreLink"),this.options.beforeToggle&&"function"==typeof this.options.beforeToggle&&this.options.beforeToggle(e,n,!r),n.css({height:a}),n.on("transitionend",function(i){return function(){i.options.afterToggle&&"function"==typeof i.options.afterToggle&&i.options.afterToggle(e,n,r),t(this).attr({"aria-expanded":r}).off("transitionend")}}(this)),t(e).replaceWith(t(this.options[s]).on("click",function(t){return function(e){t.toggle(this,i,e)}}(this)).attr({"data-readmore-toggle":n.attr("id"),"aria-controls":n.attr("id")}))},destroy:function(){t(this.element).each(function(){var e=t(this);e.attr({"data-readmore":null,"aria-expanded":null}).css({maxHeight:"",height:""}).next("[data-readmore-toggle]").remove(),e.removeData()})}},t.fn.readmore=function(e){var i=arguments,o=this.selector;return e=e||{},"object"==typeof e?this.each(function(){if(t.data(this,"plugin_"+s)){var i=t.data(this,"plugin_"+s);i.destroy.apply(i)}e.selector=o,t.data(this,"plugin_"+s,new a(this,e))}):"string"==typeof e&&"_"!==e[0]&&"init"!==e?this.each(function(){var o=t.data(this,"plugin_"+s);o instanceof a&&"function"==typeof o[e]&&o[e].apply(o,Array.prototype.slice.call(i,1))}):void 0}});;
/**
 * @file
 * Behaviours for any sub nav with class 'js-sticky-sub-nav'.
 *
 * Currently only attached to About Us & Profiles page subnavs but can be
 * attached to other subnavs. Remember to add '.js-sticky-sub-nav' to element
 * and also a 'trigger element' with the class of '.js-sub-nav-trigger'
 *
 */

(function ($, Drupal, window, document, undefined) {
  'use strict';
  Drupal.behaviors.subNav = {

    /**
     * Get the user menu states from cookie.
     * @returns {*}
     */
    getStates: function(cookie_name) {
      var states,
        cookie = $.cookie('Drupal.visitor.' + cookie_name);
      if (!cookie) {
        states = {
          show_menu: 1,
          user_closed: 0
        };
      }
      else {
        states = JSON.parse(cookie);
      }
      return states;
    },
    /**
     * Set the user menu states to cookie.
     * @returns {*}
     */
    setStates: function(states, cookie_name) {
      if (typeof states === 'object') {
        // Ensure there are default values.
        $.each({'show_menu': 0, 'user_closed': 0}, function(k, v) {
          if (typeof states[k] === 'undefined') {
            states[k] = v;
          }
        });
        $.cookie('Drupal.visitor.' + cookie_name, JSON.stringify(states), {expires: 7, path: '/'});
      }
    },

    /**
     * This makes the sticky sub nav element slide down into the viewport.
     * This happens when the user scrolls past a certain element given the class
     * '.js-sub-nav-trigger'.
     * Examples of this can be seen on university profile pages and other pages
     * where a simple sub nav is needed.
     * @param context
     */
    stickySubNav: function stickySubNav(context) {

      var $sticky_nav = $('.js-sticky-sub-nav'),
        // Element used to trigger sticky nav. If scrolled past then trigger.
        $inline_nav_trigger = $('.js-sub-nav-trigger'),
        // Class added to sticky nav element.
        sticky_class = 'sub-nav-is-sticky',
        menu_offset = 0;

      if($('body').hasClass('admin-menu')) {
        menu_offset = 25;
      }

      var updatePosition = function () {
        var trigger_position = $(this).scrollTop() >= ($inline_nav_trigger.offset().top),
            $main_nav = $('#navbar.js-sticky-nav'),
            main_nav_height = $main_nav.outerHeight();

        // If window scrolls past the trigger position.
        if (trigger_position) {
          // Pin the content
          $sticky_nav.addClass(sticky_class);
          $sticky_nav.css("margin-top", main_nav_height + menu_offset);
        }
        else {
          // Else unpin the content.
          $sticky_nav.removeClass(sticky_class);
          $sticky_nav.css("margin-top", 0);
        }
      };

      var throttled = updatePosition.throttle(50);

      $(window, context).scroll(throttled);

    },

    /**
     * The 'Sub Nav Controls' are buttons on the main menu which control the sub
     * nav for 'User', 'Share' & 'Search'.
     * @param context
     */
    subNavControls: function subNavControls(context) {


      // When nav control is clicked.
      $('.js-navbar-buttons__btn-link', context).on('click', function (event) {

        // Get sub nav being opened.
        var target_element = $(this).data('target');
        var search_menu = (target_element === 'block-the-site-search-tsskeyword');
        var user_menu = (target_element === 'block-the-login-modal-the-login-modal-multistep');
        var share_menu = (target_element === 'block-the-social-links-share-buttons');

        // Hide sub navs that aren't being opened.
        $('.region-secondary-navigation section').not('section#' + target_element).hide();

        // Close the mobile menu if open when user clicks the search icon.
        $('.navbar-collapse.in').collapse('hide');

        // If the clicked button is already highlighted.
        if ($(this).hasClass('js-btn-selected')) {
          $(this).removeClass('js-btn-selected');
        }
        else {
          // Remove highlight from other buttons and add highlight to the clicked button.
          $('.js-navbar-buttons__btn-link', context).removeClass('js-btn-selected');
          $(this).not('.js-btn-selected').addClass('js-btn-selected');
        }

        // Get/set the persistent state.
        var states = Drupal.behaviors.subNav.getStates('the_user');
        var $section = $('#block-the-login-modal-the-login-modal-multistep:visible');
        states.show_menu = ($section.length) ? 0 : 1;
        if (typeof event.isTrigger === 'undefined' && states.show_menu === 0) {
          states.user_closed = 1;
        }
        Drupal.behaviors.subNav.setStates(states, 'the_user');

        // If target is 'Search' sub nav "slide".
        if (search_menu) {
          $('section#' + target_element).slideToggle("fast");
          // Focus form field with cursor in ready state.
          $('#' + target_element).find('.form-control').focus();
        }
        else if (share_menu) {
          // Position share block and toggle
          if ($('section#' + target_element).css('display') == 'none') {
            var $button_position = ($(window).width() - ($(this).offset().left + $(this).outerWidth()) - 20);
            $('section#' + target_element).css('margin-right', $button_position + 'px');
          }
          $('section#' + target_element).fadeToggle("fast");
        }
        else {
          // User sub navs "fade".
          $('section#' + target_element).fadeToggle("fast");
        }
      });
    },

    /**
     * The Search Page requires the search bar & search toggle button to be selected and open onload.
     *
     * @param context
     */
    searchPageOverrides: function searchPageOverrides(context) {
      if (window.location.pathname === '/search') {
        // Highlight btn toggle search button
        $('.btn-toggle--search').addClass('js-btn-selected');
      }
    },

    /**
     * Method will be called when anything is attached to DOM.
     */
    attach: function (context, settings) {

      Drupal.behaviors.subNav.subNavControls(context);
      Drupal.behaviors.subNav.searchPageOverrides(context);

      // Return if sticky/inline sub nav elements don't exist.
      if ($('.js-sticky-sub-nav').length !== 0 || $('.js-sub-nav-trigger').length !== 0) {
        // Return if viewport is not >= desktop
        if (window.matchMedia("(min-width: 984px)").matches) {
          Drupal.behaviors.subNav.stickySubNav(context);
        }
      }

      // Close these when main nav menu button is clicked.
      $('button[data-toggle="collapse"]', context).on('click', function () {
        $('.region-secondary-navigation section').hide();
        $('.js-navbar-buttons__btn-link').removeClass('js-btn-selected');
      });

      // Open the menu if the previous page state was open.
      var states = Drupal.behaviors.subNav.getStates('the_user');
      if (states.show_menu === 1) {
        $('.js-toggle-user').click();
      }

    }
  };
})(jQuery, Drupal, this, this.document);
;
/*!
 * Bootstrap v3.0.2 by @fat and @mdo
 * Copyright 2013 Twitter, Inc.
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0
 *
 * Designed and built with all the love in the world by @mdo and @fat.
 */

if("undefined"==typeof jQuery)throw new Error("Bootstrap requires jQuery");+function(a){"use strict";function b(){var a=document.createElement("bootstrap"),b={WebkitTransition:"webkitTransitionEnd",MozTransition:"transitionend",OTransition:"oTransitionEnd otransitionend",transition:"transitionend"};for(var c in b)if(void 0!==a.style[c])return{end:b[c]}}a.fn.emulateTransitionEnd=function(b){var c=!1,d=this;a(this).one(a.support.transition.end,function(){c=!0});var e=function(){c||a(d).trigger(a.support.transition.end)};return setTimeout(e,b),this},a(function(){a.support.transition=b()})}(jQuery),+function(a){"use strict";var b='[data-dismiss="alert"]',c=function(c){a(c).on("click",b,this.close)};c.prototype.close=function(b){function c(){f.trigger("closed.bs.alert").remove()}var d=a(this),e=d.attr("data-target");e||(e=d.attr("href"),e=e&&e.replace(/.*(?=#[^\s]*$)/,""));var f=a(e);b&&b.preventDefault(),f.length||(f=d.hasClass("alert")?d:d.parent()),f.trigger(b=a.Event("close.bs.alert")),b.isDefaultPrevented()||(f.removeClass("in"),a.support.transition&&f.hasClass("fade")?f.one(a.support.transition.end,c).emulateTransitionEnd(150):c())};var d=a.fn.alert;a.fn.alert=function(b){return this.each(function(){var d=a(this),e=d.data("bs.alert");e||d.data("bs.alert",e=new c(this)),"string"==typeof b&&e[b].call(d)})},a.fn.alert.Constructor=c,a.fn.alert.noConflict=function(){return a.fn.alert=d,this},a(document).on("click.bs.alert.data-api",b,c.prototype.close)}(jQuery),+function(a){"use strict";var b=function(c,d){this.$element=a(c),this.options=a.extend({},b.DEFAULTS,d)};b.DEFAULTS={loadingText:"loading..."},b.prototype.setState=function(a){var b="disabled",c=this.$element,d=c.is("input")?"val":"html",e=c.data();a+="Text",e.resetText||c.data("resetText",c[d]()),c[d](e[a]||this.options[a]),setTimeout(function(){"loadingText"==a?c.addClass(b).attr(b,b):c.removeClass(b).removeAttr(b)},0)},b.prototype.toggle=function(){var a=this.$element.closest('[data-toggle="buttons"]');if(a.length){var b=this.$element.find("input").prop("checked",!this.$element.hasClass("active")).trigger("change");"radio"===b.prop("type")&&a.find(".active").removeClass("active")}this.$element.toggleClass("active")};var c=a.fn.button;a.fn.button=function(c){return this.each(function(){var d=a(this),e=d.data("bs.button"),f="object"==typeof c&&c;e||d.data("bs.button",e=new b(this,f)),"toggle"==c?e.toggle():c&&e.setState(c)})},a.fn.button.Constructor=b,a.fn.button.noConflict=function(){return a.fn.button=c,this},a(document).on("click.bs.button.data-api","[data-toggle^=button]",function(b){var c=a(b.target);c.hasClass("btn")||(c=c.closest(".btn")),c.button("toggle"),b.preventDefault()})}(jQuery),+function(a){"use strict";var b=function(b,c){this.$element=a(b),this.$indicators=this.$element.find(".carousel-indicators"),this.options=c,this.paused=this.sliding=this.interval=this.$active=this.$items=null,"hover"==this.options.pause&&this.$element.on("mouseenter",a.proxy(this.pause,this)).on("mouseleave",a.proxy(this.cycle,this))};b.DEFAULTS={interval:5e3,pause:"hover",wrap:!0},b.prototype.cycle=function(b){return b||(this.paused=!1),this.interval&&clearInterval(this.interval),this.options.interval&&!this.paused&&(this.interval=setInterval(a.proxy(this.next,this),this.options.interval)),this},b.prototype.getActiveIndex=function(){return this.$active=this.$element.find(".item.active"),this.$items=this.$active.parent().children(),this.$items.index(this.$active)},b.prototype.to=function(b){var c=this,d=this.getActiveIndex();return b>this.$items.length-1||0>b?void 0:this.sliding?this.$element.one("slid",function(){c.to(b)}):d==b?this.pause().cycle():this.slide(b>d?"next":"prev",a(this.$items[b]))},b.prototype.pause=function(b){return b||(this.paused=!0),this.$element.find(".next, .prev").length&&a.support.transition.end&&(this.$element.trigger(a.support.transition.end),this.cycle(!0)),this.interval=clearInterval(this.interval),this},b.prototype.next=function(){return this.sliding?void 0:this.slide("next")},b.prototype.prev=function(){return this.sliding?void 0:this.slide("prev")},b.prototype.slide=function(b,c){var d=this.$element.find(".item.active"),e=c||d[b](),f=this.interval,g="next"==b?"left":"right",h="next"==b?"first":"last",i=this;if(!e.length){if(!this.options.wrap)return;e=this.$element.find(".item")[h]()}this.sliding=!0,f&&this.pause();var j=a.Event("slide.bs.carousel",{relatedTarget:e[0],direction:g});if(!e.hasClass("active")){if(this.$indicators.length&&(this.$indicators.find(".active").removeClass("active"),this.$element.one("slid",function(){var b=a(i.$indicators.children()[i.getActiveIndex()]);b&&b.addClass("active")})),a.support.transition&&this.$element.hasClass("slide")){if(this.$element.trigger(j),j.isDefaultPrevented())return;e.addClass(b),e[0].offsetWidth,d.addClass(g),e.addClass(g),d.one(a.support.transition.end,function(){e.removeClass([b,g].join(" ")).addClass("active"),d.removeClass(["active",g].join(" ")),i.sliding=!1,setTimeout(function(){i.$element.trigger("slid")},0)}).emulateTransitionEnd(600)}else{if(this.$element.trigger(j),j.isDefaultPrevented())return;d.removeClass("active"),e.addClass("active"),this.sliding=!1,this.$element.trigger("slid")}return f&&this.cycle(),this}};var c=a.fn.carousel;a.fn.carousel=function(c){return this.each(function(){var d=a(this),e=d.data("bs.carousel"),f=a.extend({},b.DEFAULTS,d.data(),"object"==typeof c&&c),g="string"==typeof c?c:f.slide;e||d.data("bs.carousel",e=new b(this,f)),"number"==typeof c?e.to(c):g?e[g]():f.interval&&e.pause().cycle()})},a.fn.carousel.Constructor=b,a.fn.carousel.noConflict=function(){return a.fn.carousel=c,this},a(document).on("click.bs.carousel.data-api","[data-slide], [data-slide-to]",function(b){var c,d=a(this),e=a(d.attr("data-target")||(c=d.attr("href"))&&c.replace(/.*(?=#[^\s]+$)/,"")),f=a.extend({},e.data(),d.data()),g=d.attr("data-slide-to");g&&(f.interval=!1),e.carousel(f),(g=d.attr("data-slide-to"))&&e.data("bs.carousel").to(g),b.preventDefault()}),a(window).on("load",function(){a('[data-ride="carousel"]').each(function(){var b=a(this);b.carousel(b.data())})})}(jQuery),+function(a){"use strict";var b=function(c,d){this.$element=a(c),this.options=a.extend({},b.DEFAULTS,d),this.transitioning=null,this.options.parent&&(this.$parent=a(this.options.parent)),this.options.toggle&&this.toggle()};b.DEFAULTS={toggle:!0},b.prototype.dimension=function(){var a=this.$element.hasClass("width");return a?"width":"height"},b.prototype.show=function(){if(!this.transitioning&&!this.$element.hasClass("in")){var b=a.Event("show.bs.collapse");if(this.$element.trigger(b),!b.isDefaultPrevented()){var c=this.$parent&&this.$parent.find("> .panel > .in");if(c&&c.length){var d=c.data("bs.collapse");if(d&&d.transitioning)return;c.collapse("hide"),d||c.data("bs.collapse",null)}var e=this.dimension();this.$element.removeClass("collapse").addClass("collapsing")[e](0),this.transitioning=1;var f=function(){this.$element.removeClass("collapsing").addClass("in")[e]("auto"),this.transitioning=0,this.$element.trigger("shown.bs.collapse")};if(!a.support.transition)return f.call(this);var g=a.camelCase(["scroll",e].join("-"));this.$element.one(a.support.transition.end,a.proxy(f,this)).emulateTransitionEnd(350)[e](this.$element[0][g])}}},b.prototype.hide=function(){if(!this.transitioning&&this.$element.hasClass("in")){var b=a.Event("hide.bs.collapse");if(this.$element.trigger(b),!b.isDefaultPrevented()){var c=this.dimension();this.$element[c](this.$element[c]())[0].offsetHeight,this.$element.addClass("collapsing").removeClass("collapse").removeClass("in"),this.transitioning=1;var d=function(){this.transitioning=0,this.$element.trigger("hidden.bs.collapse").removeClass("collapsing").addClass("collapse")};return a.support.transition?(this.$element[c](0).one(a.support.transition.end,a.proxy(d,this)).emulateTransitionEnd(350),void 0):d.call(this)}}},b.prototype.toggle=function(){this[this.$element.hasClass("in")?"hide":"show"]()};var c=a.fn.collapse;a.fn.collapse=function(c){return this.each(function(){var d=a(this),e=d.data("bs.collapse"),f=a.extend({},b.DEFAULTS,d.data(),"object"==typeof c&&c);e||d.data("bs.collapse",e=new b(this,f)),"string"==typeof c&&e[c]()})},a.fn.collapse.Constructor=b,a.fn.collapse.noConflict=function(){return a.fn.collapse=c,this},a(document).on("click.bs.collapse.data-api","[data-toggle=collapse]",function(b){var c,d=a(this),e=d.attr("data-target")||b.preventDefault()||(c=d.attr("href"))&&c.replace(/.*(?=#[^\s]+$)/,""),f=a(e),g=f.data("bs.collapse"),h=g?"toggle":d.data(),i=d.attr("data-parent"),j=i&&a(i);g&&g.transitioning||(j&&j.find('[data-toggle=collapse][data-parent="'+i+'"]').not(d).addClass("collapsed"),d[f.hasClass("in")?"addClass":"removeClass"]("collapsed")),f.collapse(h)})}(jQuery),+function(a){"use strict";function b(){a(d).remove(),a(e).each(function(b){var d=c(a(this));d.hasClass("open")&&(d.trigger(b=a.Event("hide.bs.dropdown")),b.isDefaultPrevented()||d.removeClass("open").trigger("hidden.bs.dropdown"))})}function c(b){var c=b.attr("data-target");c||(c=b.attr("href"),c=c&&/#/.test(c)&&c.replace(/.*(?=#[^\s]*$)/,""));var d=c&&a(c);return d&&d.length?d:b.parent()}var d=".dropdown-backdrop",e="[data-toggle=dropdown]",f=function(b){a(b).on("click.bs.dropdown",this.toggle)};f.prototype.toggle=function(d){var e=a(this);if(!e.is(".disabled, :disabled")){var f=c(e),g=f.hasClass("open");if(b(),!g){if("ontouchstart"in document.documentElement&&!f.closest(".navbar-nav").length&&a('<div class="dropdown-backdrop"/>').insertAfter(a(this)).on("click",b),f.trigger(d=a.Event("show.bs.dropdown")),d.isDefaultPrevented())return;f.toggleClass("open").trigger("shown.bs.dropdown"),e.focus()}return!1}},f.prototype.keydown=function(b){if(/(38|40|27)/.test(b.keyCode)){var d=a(this);if(b.preventDefault(),b.stopPropagation(),!d.is(".disabled, :disabled")){var f=c(d),g=f.hasClass("open");if(!g||g&&27==b.keyCode)return 27==b.which&&f.find(e).focus(),d.click();var h=a("[role=menu] li:not(.divider):visible a",f);if(h.length){var i=h.index(h.filter(":focus"));38==b.keyCode&&i>0&&i--,40==b.keyCode&&i<h.length-1&&i++,~i||(i=0),h.eq(i).focus()}}}};var g=a.fn.dropdown;a.fn.dropdown=function(b){return this.each(function(){var c=a(this),d=c.data("dropdown");d||c.data("dropdown",d=new f(this)),"string"==typeof b&&d[b].call(c)})},a.fn.dropdown.Constructor=f,a.fn.dropdown.noConflict=function(){return a.fn.dropdown=g,this},a(document).on("click.bs.dropdown.data-api",b).on("click.bs.dropdown.data-api",".dropdown form",function(a){a.stopPropagation()}).on("click.bs.dropdown.data-api",e,f.prototype.toggle).on("keydown.bs.dropdown.data-api",e+", [role=menu]",f.prototype.keydown)}(jQuery),+function(a){"use strict";var b=function(b,c){this.options=c,this.$element=a(b),this.$backdrop=this.isShown=null,this.options.remote&&this.$element.load(this.options.remote)};b.DEFAULTS={backdrop:!0,keyboard:!0,show:!0},b.prototype.toggle=function(a){return this[this.isShown?"hide":"show"](a)},b.prototype.show=function(b){var c=this,d=a.Event("show.bs.modal",{relatedTarget:b});this.$element.trigger(d),this.isShown||d.isDefaultPrevented()||(this.isShown=!0,this.escape(),this.$element.on("click.dismiss.modal",'[data-dismiss="modal"]',a.proxy(this.hide,this)),this.backdrop(function(){var d=a.support.transition&&c.$element.hasClass("fade");c.$element.parent().length||c.$element.appendTo(document.body),c.$element.show(),d&&c.$element[0].offsetWidth,c.$element.addClass("in").attr("aria-hidden",!1),c.enforceFocus();var e=a.Event("shown.bs.modal",{relatedTarget:b});d?c.$element.find(".modal-dialog").one(a.support.transition.end,function(){c.$element.focus().trigger(e)}).emulateTransitionEnd(300):c.$element.focus().trigger(e)}))},b.prototype.hide=function(b){b&&b.preventDefault(),b=a.Event("hide.bs.modal"),this.$element.trigger(b),this.isShown&&!b.isDefaultPrevented()&&(this.isShown=!1,this.escape(),a(document).off("focusin.bs.modal"),this.$element.removeClass("in").attr("aria-hidden",!0).off("click.dismiss.modal"),a.support.transition&&this.$element.hasClass("fade")?this.$element.one(a.support.transition.end,a.proxy(this.hideModal,this)).emulateTransitionEnd(300):this.hideModal())},b.prototype.enforceFocus=function(){a(document).off("focusin.bs.modal").on("focusin.bs.modal",a.proxy(function(a){this.$element[0]===a.target||this.$element.has(a.target).length||this.$element.focus()},this))},b.prototype.escape=function(){this.isShown&&this.options.keyboard?this.$element.on("keyup.dismiss.bs.modal",a.proxy(function(a){27==a.which&&this.hide()},this)):this.isShown||this.$element.off("keyup.dismiss.bs.modal")},b.prototype.hideModal=function(){var a=this;this.$element.hide(),this.backdrop(function(){a.removeBackdrop(),a.$element.trigger("hidden.bs.modal")})},b.prototype.removeBackdrop=function(){this.$backdrop&&this.$backdrop.remove(),this.$backdrop=null},b.prototype.backdrop=function(b){var c=this.$element.hasClass("fade")?"fade":"";if(this.isShown&&this.options.backdrop){var d=a.support.transition&&c;if(this.$backdrop=a('<div class="modal-backdrop '+c+'" />').appendTo(document.body),this.$element.on("click.dismiss.modal",a.proxy(function(a){a.target===a.currentTarget&&("static"==this.options.backdrop?this.$element[0].focus.call(this.$element[0]):this.hide.call(this))},this)),d&&this.$backdrop[0].offsetWidth,this.$backdrop.addClass("in"),!b)return;d?this.$backdrop.one(a.support.transition.end,b).emulateTransitionEnd(150):b()}else!this.isShown&&this.$backdrop?(this.$backdrop.removeClass("in"),a.support.transition&&this.$element.hasClass("fade")?this.$backdrop.one(a.support.transition.end,b).emulateTransitionEnd(150):b()):b&&b()};var c=a.fn.modal;a.fn.modal=function(c,d){return this.each(function(){var e=a(this),f=e.data("bs.modal"),g=a.extend({},b.DEFAULTS,e.data(),"object"==typeof c&&c);f||e.data("bs.modal",f=new b(this,g)),"string"==typeof c?f[c](d):g.show&&f.show(d)})},a.fn.modal.Constructor=b,a.fn.modal.noConflict=function(){return a.fn.modal=c,this},a(document).on("click.bs.modal.data-api",'[data-toggle="modal"]',function(b){var c=a(this),d=c.attr("href"),e=a(c.attr("data-target")||d&&d.replace(/.*(?=#[^\s]+$)/,"")),f=e.data("modal")?"toggle":a.extend({remote:!/#/.test(d)&&d},e.data(),c.data());b.preventDefault(),e.modal(f,this).one("hide",function(){c.is(":visible")&&c.focus()})}),a(document).on("show.bs.modal",".modal",function(){a(document.body).addClass("modal-open")}).on("hidden.bs.modal",".modal",function(){a(document.body).removeClass("modal-open")})}(jQuery),+function(a){"use strict";var b=function(a,b){this.type=this.options=this.enabled=this.timeout=this.hoverState=this.$element=null,this.init("tooltip",a,b)};b.DEFAULTS={animation:!0,placement:"top",selector:!1,template:'<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',trigger:"hover focus",title:"",delay:0,html:!1,container:!1},b.prototype.init=function(b,c,d){this.enabled=!0,this.type=b,this.$element=a(c),this.options=this.getOptions(d);for(var e=this.options.trigger.split(" "),f=e.length;f--;){var g=e[f];if("click"==g)this.$element.on("click."+this.type,this.options.selector,a.proxy(this.toggle,this));else if("manual"!=g){var h="hover"==g?"mouseenter":"focus",i="hover"==g?"mouseleave":"blur";this.$element.on(h+"."+this.type,this.options.selector,a.proxy(this.enter,this)),this.$element.on(i+"."+this.type,this.options.selector,a.proxy(this.leave,this))}}this.options.selector?this._options=a.extend({},this.options,{trigger:"manual",selector:""}):this.fixTitle()},b.prototype.getDefaults=function(){return b.DEFAULTS},b.prototype.getOptions=function(b){return b=a.extend({},this.getDefaults(),this.$element.data(),b),b.delay&&"number"==typeof b.delay&&(b.delay={show:b.delay,hide:b.delay}),b},b.prototype.getDelegateOptions=function(){var b={},c=this.getDefaults();return this._options&&a.each(this._options,function(a,d){c[a]!=d&&(b[a]=d)}),b},b.prototype.enter=function(b){var c=b instanceof this.constructor?b:a(b.currentTarget)[this.type](this.getDelegateOptions()).data("bs."+this.type);return clearTimeout(c.timeout),c.hoverState="in",c.options.delay&&c.options.delay.show?(c.timeout=setTimeout(function(){"in"==c.hoverState&&c.show()},c.options.delay.show),void 0):c.show()},b.prototype.leave=function(b){var c=b instanceof this.constructor?b:a(b.currentTarget)[this.type](this.getDelegateOptions()).data("bs."+this.type);return clearTimeout(c.timeout),c.hoverState="out",c.options.delay&&c.options.delay.hide?(c.timeout=setTimeout(function(){"out"==c.hoverState&&c.hide()},c.options.delay.hide),void 0):c.hide()},b.prototype.show=function(){var b=a.Event("show.bs."+this.type);if(this.hasContent()&&this.enabled){if(this.$element.trigger(b),b.isDefaultPrevented())return;var c=this.tip();this.setContent(),this.options.animation&&c.addClass("fade");var d="function"==typeof this.options.placement?this.options.placement.call(this,c[0],this.$element[0]):this.options.placement,e=/\s?auto?\s?/i,f=e.test(d);f&&(d=d.replace(e,"")||"top"),c.detach().css({top:0,left:0,display:"block"}).addClass(d),this.options.container?c.appendTo(this.options.container):c.insertAfter(this.$element);var g=this.getPosition(),h=c[0].offsetWidth,i=c[0].offsetHeight;if(f){var j=this.$element.parent(),k=d,l=document.documentElement.scrollTop||document.body.scrollTop,m="body"==this.options.container?window.innerWidth:j.outerWidth(),n="body"==this.options.container?window.innerHeight:j.outerHeight(),o="body"==this.options.container?0:j.offset().left;d="bottom"==d&&g.top+g.height+i-l>n?"top":"top"==d&&g.top-l-i<0?"bottom":"right"==d&&g.right+h>m?"left":"left"==d&&g.left-h<o?"right":d,c.removeClass(k).addClass(d)}var p=this.getCalculatedOffset(d,g,h,i);this.applyPlacement(p,d),this.$element.trigger("shown.bs."+this.type)}},b.prototype.applyPlacement=function(a,b){var c,d=this.tip(),e=d[0].offsetWidth,f=d[0].offsetHeight,g=parseInt(d.css("margin-top"),10),h=parseInt(d.css("margin-left"),10);isNaN(g)&&(g=0),isNaN(h)&&(h=0),a.top=a.top+g,a.left=a.left+h,d.offset(a).addClass("in");var i=d[0].offsetWidth,j=d[0].offsetHeight;if("top"==b&&j!=f&&(c=!0,a.top=a.top+f-j),/bottom|top/.test(b)){var k=0;a.left<0&&(k=-2*a.left,a.left=0,d.offset(a),i=d[0].offsetWidth,j=d[0].offsetHeight),this.replaceArrow(k-e+i,i,"left")}else this.replaceArrow(j-f,j,"top");c&&d.offset(a)},b.prototype.replaceArrow=function(a,b,c){this.arrow().css(c,a?50*(1-a/b)+"%":"")},b.prototype.setContent=function(){var a=this.tip(),b=this.getTitle();a.find(".tooltip-inner")[this.options.html?"html":"text"](b),a.removeClass("fade in top bottom left right")},b.prototype.hide=function(){function b(){"in"!=c.hoverState&&d.detach()}var c=this,d=this.tip(),e=a.Event("hide.bs."+this.type);return this.$element.trigger(e),e.isDefaultPrevented()?void 0:(d.removeClass("in"),a.support.transition&&this.$tip.hasClass("fade")?d.one(a.support.transition.end,b).emulateTransitionEnd(150):b(),this.$element.trigger("hidden.bs."+this.type),this)},b.prototype.fixTitle=function(){var a=this.$element;(a.attr("title")||"string"!=typeof a.attr("data-original-title"))&&a.attr("data-original-title",a.attr("title")||"").attr("title","")},b.prototype.hasContent=function(){return this.getTitle()},b.prototype.getPosition=function(){var b=this.$element[0];return a.extend({},"function"==typeof b.getBoundingClientRect?b.getBoundingClientRect():{width:b.offsetWidth,height:b.offsetHeight},this.$element.offset())},b.prototype.getCalculatedOffset=function(a,b,c,d){return"bottom"==a?{top:b.top+b.height,left:b.left+b.width/2-c/2}:"top"==a?{top:b.top-d,left:b.left+b.width/2-c/2}:"left"==a?{top:b.top+b.height/2-d/2,left:b.left-c}:{top:b.top+b.height/2-d/2,left:b.left+b.width}},b.prototype.getTitle=function(){var a,b=this.$element,c=this.options;return a=b.attr("data-original-title")||("function"==typeof c.title?c.title.call(b[0]):c.title)},b.prototype.tip=function(){return this.$tip=this.$tip||a(this.options.template)},b.prototype.arrow=function(){return this.$arrow=this.$arrow||this.tip().find(".tooltip-arrow")},b.prototype.validate=function(){this.$element[0].parentNode||(this.hide(),this.$element=null,this.options=null)},b.prototype.enable=function(){this.enabled=!0},b.prototype.disable=function(){this.enabled=!1},b.prototype.toggleEnabled=function(){this.enabled=!this.enabled},b.prototype.toggle=function(b){var c=b?a(b.currentTarget)[this.type](this.getDelegateOptions()).data("bs."+this.type):this;c.tip().hasClass("in")?c.leave(c):c.enter(c)},b.prototype.destroy=function(){this.hide().$element.off("."+this.type).removeData("bs."+this.type)};var c=a.fn.tooltip;a.fn.tooltip=function(c){return this.each(function(){var d=a(this),e=d.data("bs.tooltip"),f="object"==typeof c&&c;e||d.data("bs.tooltip",e=new b(this,f)),"string"==typeof c&&e[c]()})},a.fn.tooltip.Constructor=b,a.fn.tooltip.noConflict=function(){return a.fn.tooltip=c,this}}(jQuery),+function(a){"use strict";var b=function(a,b){this.init("popover",a,b)};if(!a.fn.tooltip)throw new Error("Popover requires tooltip.js");b.DEFAULTS=a.extend({},a.fn.tooltip.Constructor.DEFAULTS,{placement:"right",trigger:"click",content:"",template:'<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'}),b.prototype=a.extend({},a.fn.tooltip.Constructor.prototype),b.prototype.constructor=b,b.prototype.getDefaults=function(){return b.DEFAULTS},b.prototype.setContent=function(){var a=this.tip(),b=this.getTitle(),c=this.getContent();a.find(".popover-title")[this.options.html?"html":"text"](b),a.find(".popover-content")[this.options.html?"html":"text"](c),a.removeClass("fade top bottom left right in"),a.find(".popover-title").html()||a.find(".popover-title").hide()},b.prototype.hasContent=function(){return this.getTitle()||this.getContent()},b.prototype.getContent=function(){var a=this.$element,b=this.options;return a.attr("data-content")||("function"==typeof b.content?b.content.call(a[0]):b.content)},b.prototype.arrow=function(){return this.$arrow=this.$arrow||this.tip().find(".arrow")},b.prototype.tip=function(){return this.$tip||(this.$tip=a(this.options.template)),this.$tip};var c=a.fn.popover;a.fn.popover=function(c){return this.each(function(){var d=a(this),e=d.data("bs.popover"),f="object"==typeof c&&c;e||d.data("bs.popover",e=new b(this,f)),"string"==typeof c&&e[c]()})},a.fn.popover.Constructor=b,a.fn.popover.noConflict=function(){return a.fn.popover=c,this}}(jQuery),+function(a){"use strict";function b(c,d){var e,f=a.proxy(this.process,this);this.$element=a(c).is("body")?a(window):a(c),this.$body=a("body"),this.$scrollElement=this.$element.on("scroll.bs.scroll-spy.data-api",f),this.options=a.extend({},b.DEFAULTS,d),this.selector=(this.options.target||(e=a(c).attr("href"))&&e.replace(/.*(?=#[^\s]+$)/,"")||"")+" .nav li > a",this.offsets=a([]),this.targets=a([]),this.activeTarget=null,this.refresh(),this.process()}b.DEFAULTS={offset:10},b.prototype.refresh=function(){var b=this.$element[0]==window?"offset":"position";this.offsets=a([]),this.targets=a([]);var c=this;this.$body.find(this.selector).map(function(){var d=a(this),e=d.data("target")||d.attr("href"),f=/^#\w/.test(e)&&a(e);return f&&f.length&&[[f[b]().top+(!a.isWindow(c.$scrollElement.get(0))&&c.$scrollElement.scrollTop()),e]]||null}).sort(function(a,b){return a[0]-b[0]}).each(function(){c.offsets.push(this[0]),c.targets.push(this[1])})},b.prototype.process=function(){var a,b=this.$scrollElement.scrollTop()+this.options.offset,c=this.$scrollElement[0].scrollHeight||this.$body[0].scrollHeight,d=c-this.$scrollElement.height(),e=this.offsets,f=this.targets,g=this.activeTarget;if(b>=d)return g!=(a=f.last()[0])&&this.activate(a);for(a=e.length;a--;)g!=f[a]&&b>=e[a]&&(!e[a+1]||b<=e[a+1])&&this.activate(f[a])},b.prototype.activate=function(b){this.activeTarget=b,a(this.selector).parents(".active").removeClass("active");var c=this.selector+'[data-target="'+b+'"],'+this.selector+'[href="'+b+'"]',d=a(c).parents("li").addClass("active");d.parent(".dropdown-menu").length&&(d=d.closest("li.dropdown").addClass("active")),d.trigger("activate")};var c=a.fn.scrollspy;a.fn.scrollspy=function(c){return this.each(function(){var d=a(this),e=d.data("bs.scrollspy"),f="object"==typeof c&&c;e||d.data("bs.scrollspy",e=new b(this,f)),"string"==typeof c&&e[c]()})},a.fn.scrollspy.Constructor=b,a.fn.scrollspy.noConflict=function(){return a.fn.scrollspy=c,this},a(window).on("load",function(){a('[data-spy="scroll"]').each(function(){var b=a(this);b.scrollspy(b.data())})})}(jQuery),+function(a){"use strict";var b=function(b){this.element=a(b)};b.prototype.show=function(){var b=this.element,c=b.closest("ul:not(.dropdown-menu)"),d=b.data("target");if(d||(d=b.attr("href"),d=d&&d.replace(/.*(?=#[^\s]*$)/,"")),!b.parent("li").hasClass("active")){var e=c.find(".active:last a")[0],f=a.Event("show.bs.tab",{relatedTarget:e});if(b.trigger(f),!f.isDefaultPrevented()){var g=a(d);this.activate(b.parent("li"),c),this.activate(g,g.parent(),function(){b.trigger({type:"shown.bs.tab",relatedTarget:e})})}}},b.prototype.activate=function(b,c,d){function e(){f.removeClass("active").find("> .dropdown-menu > .active").removeClass("active"),b.addClass("active"),g?(b[0].offsetWidth,b.addClass("in")):b.removeClass("fade"),b.parent(".dropdown-menu")&&b.closest("li.dropdown").addClass("active"),d&&d()}var f=c.find("> .active"),g=d&&a.support.transition&&f.hasClass("fade");g?f.one(a.support.transition.end,e).emulateTransitionEnd(150):e(),f.removeClass("in")};var c=a.fn.tab;a.fn.tab=function(c){return this.each(function(){var d=a(this),e=d.data("bs.tab");e||d.data("bs.tab",e=new b(this)),"string"==typeof c&&e[c]()})},a.fn.tab.Constructor=b,a.fn.tab.noConflict=function(){return a.fn.tab=c,this},a(document).on("click.bs.tab.data-api",'[data-toggle="tab"], [data-toggle="pill"]',function(b){b.preventDefault(),a(this).tab("show")})}(jQuery),+function(a){"use strict";var b=function(c,d){this.options=a.extend({},b.DEFAULTS,d),this.$window=a(window).on("scroll.bs.affix.data-api",a.proxy(this.checkPosition,this)).on("click.bs.affix.data-api",a.proxy(this.checkPositionWithEventLoop,this)),this.$element=a(c),this.affixed=this.unpin=null,this.checkPosition()};b.RESET="affix affix-top affix-bottom",b.DEFAULTS={offset:0},b.prototype.checkPositionWithEventLoop=function(){setTimeout(a.proxy(this.checkPosition,this),1)},b.prototype.checkPosition=function(){if(this.$element.is(":visible")){var c=a(document).height(),d=this.$window.scrollTop(),e=this.$element.offset(),f=this.options.offset,g=f.top,h=f.bottom;"object"!=typeof f&&(h=g=f),"function"==typeof g&&(g=f.top()),"function"==typeof h&&(h=f.bottom());var i=null!=this.unpin&&d+this.unpin<=e.top?!1:null!=h&&e.top+this.$element.height()>=c-h?"bottom":null!=g&&g>=d?"top":!1;this.affixed!==i&&(this.unpin&&this.$element.css("top",""),this.affixed=i,this.unpin="bottom"==i?e.top-d:null,this.$element.removeClass(b.RESET).addClass("affix"+(i?"-"+i:"")),"bottom"==i&&this.$element.offset({top:document.body.offsetHeight-h-this.$element.height()}))}};var c=a.fn.affix;a.fn.affix=function(c){return this.each(function(){var d=a(this),e=d.data("bs.affix"),f="object"==typeof c&&c;e||d.data("bs.affix",e=new b(this,f)),"string"==typeof c&&e[c]()})},a.fn.affix.Constructor=b,a.fn.affix.noConflict=function(){return a.fn.affix=c,this},a(window).on("load",function(){a('[data-spy="affix"]').each(function(){var b=a(this),c=b.data();c.offset=c.offset||{},c.offsetBottom&&(c.offset.bottom=c.offsetBottom),c.offsetTop&&(c.offset.top=c.offsetTop),b.affix(c)})})}(jQuery);;
/**
 * @file
 * Trigger popovers in a customised way.
 */

(function ($, Drupal, window, document, undefined) {
  'use strict';

  // Add listener to document because .js-popover-close won't exist on page load.
  $(document).on('click', '.js-popover-close' , function(e){
    e.preventDefault();
    // Find the element that triggered the popover.
    var $parent = $(this).closest('.js-popover-mobile');
    var $this_popover = $parent.siblings('.js-custom-popover-trigger');
    $this_popover.popover('toggle');
  });

  Drupal.behaviors.popoverCustom = {
    /**
     * Method will be called when anything is attached to DOM.
     */
    attach: function (context, settings) {
      // Initialise custom popovers depending on device width.
      if (window.matchMedia("(max-width: 767px)").matches) {
        $('.js-custom-popover-trigger', context).popover({
          trigger: 'click',
          placement: 'auto',
          title: 'Choose an individual SDG table to explore<a class="close popover-mobile__close js-popover-close" href="#">&times;</a>',
          template: '<div class="popover popover-mobile js-popover-mobile"><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
        });
      } else {
        $('.js-custom-popover-trigger', context).popover({
          trigger: 'focus', // So it's tabbable.
          placement: 'right'
        });
      }
    }
  };
})(jQuery, Drupal, this, this.document);
;
