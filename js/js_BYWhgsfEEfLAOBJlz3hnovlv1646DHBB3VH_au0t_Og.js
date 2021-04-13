(function ($) {
  'use strict';

  Drupal.behaviors.mzAnalyticsRegistrationEvents = {
    attach: function (context) {

      var events = {
        // CLICK events
        click: {
          // Open login modal from main menu.
          login_link: {
            selector: $('.js-mz-login-main'),
            eventTitle: 'open-login-modal',
            eventSource: 'navigation'
          },
          // Open login modal from register modal.
          login_link_from_reg: {
            selector: $('.js-mz-login-from-reg'),
            eventTitle: 'open-login-modal',
            eventSource: 'registration-process'
          },
          // Open register modal from user menu.
          register_link_from_navigation: {
            selector: $('.js-mz-register-main'),
            eventTitle: 'open-register-modal', // changed open-modal to open-register-modal
            eventSource: 'navigation' // changed registration-process to navigation
          },
          // Open student register modal.
          registration_cta_main: {
            selector: $('.js-mz-registration-cta-main'),
            eventTitle: 'open-registration-cta-modal',
            eventSource: 'student-register-cta'
          },
          // Close registration cta
          registration_cta_close: {
            selector: $('.js-mz-registration-cta-nag-close'),
            eventTitle: 'close-registration-cta',
            eventSource: 'student-register-cta'
          },
          // Open register modal from the login modal.
          register_link_from_login: {
            selector: $('.js-mz-register-from-login'),
            eventTitle: 'open-register-modal',
            eventSource: 'login-process'
          },
          // Click to sign up with email
          register_email: {
            selector: $('.js-mz-register-with-email'),
            eventTitle: 'email-identify-provider',
            eventSource: 'registration-process'
          },
          // Click to T&Cs during registration
          register_tcs: {
            selector: $('.js-mz-tcs-from-reg'),
            eventTitle: 'terms-and-conditions-registration',
            eventSource: 'registration-process'
          },
          // Click cookie policy during registration
          register_cookies: {
            selector: $('.js-mz-cookies-from-reg'),
            eventTitle: 'cookie-policy-registration',
            eventSource: 'registration-process'
          },
          // Click privacy policy during registration
          register_privacy: {
            selector: $('.js-mz-privacy-from-reg'),
            eventTitle: 'privacy-policy-registration',
            eventSource: 'registration-process'
          },
          // Click newsletter back button during registration
          newsletters_back: {
            selector: $('.js-mz-newsletters-back'),
            eventTitle: 'back-newsletters',
            eventSource: 'registration-process'
          },
          // Click extra profile form skip during registration
          extra_profile_skip: {
            selector: $('.js-mz-extra-profile-skip'),
            eventTitle: 'skip-extra-profile-form',
            eventSource: 'registration-process'
          },
          // Click extra profile form skip during registration
          extra_profile_back: {
            selector: $('.js-mz-extra-profile-back'),
            eventTitle: 'back-extra-profile-form',
            eventSource: 'registration-process'
          },
          // Click extra profile form skip during registration
          guide_download_back: {
            selector: $('.js-mz-guide-download-back'),
            eventTitle: 'back-opt-in',
            eventSource: 'registration-process'
          },
        },
        // CLOSE events
        close: {
          // Close login modal
          close_login_modal: {
            selector: $('#user-login .ctools-close-modal'),
            eventTitle: 'abandon-login',
            eventSource: 'login-process'
          },
          // Close register modal
          close_reg_modal: {
            selector: $('.js-mz-registration-multistep .ctools-close-modal'),
            eventTitle: convert_stepname_to_eventtitle($(".js-mz-multistep-form").attr("data-step")),
            eventSource: 'registration-process'
          }
        },
        // SUBMIT events
        submit: {
          // Login via Google
          login_google: {
            selector: $('#user-login .hybridauth-widget-provider[data-hybridauth-provider="Google"]'),
            eventTitle: 'google-login',
            eventSource: 'login-process'
          },
          // Login via Facebook
          login_facebook: {
            selector: $('#user-login .hybridauth-widget-provider[data-hybridauth-provider="Facebook"]'),
            eventTitle: 'facebook-login',
            eventSource: 'login-process'
          },
          // Login submit button
          login_email: {
            selector: $('.js-mz-login-with-email'),
            eventTitle: 'email-login',
            eventSource: 'login-process'
          },
          // Register via Google
          register_google: {
            selector: $('.js-mz-registration-multistep .hybridauth-widget-provider[data-hybridauth-provider="Google"]'),
            eventTitle: 'google-identify-provider',
            eventSource: 'registration-process'
          },
          // Register via Facebook
          register_facebook: {
            selector: $('.js-mz-registration-multistep .hybridauth-widget-provider[data-hybridauth-provider="Facebook"]'),
            eventTitle: 'facebook-identify-provider',
            eventSource: 'registration-process'
          },
          // Newsletters submit button
          register_newsletters: {
            selector: $('.js-mz-newsletters-submit'),
            eventTitle: 'newsletters-submit',
            eventSource: 'registration-process'
          },
          // Profile submit button
          register_profile: {
            selector: $('.js-mz-profile-submit').not('.disabled'),
            eventTitle: 'success-segment',
            eventSource: 'registration-process'
          },
          // Profile submit button
          register_extra_profile: {
            selector: $('.js-mz-extra-profile-submit'),
            eventTitle: 'extra-profile-form-submit',
            eventSource: 'registration-process'
          },
          // Complete registration and download submit
          guide_download_submit: {
            selector: $('.js-mz-guide-download-submit'),
            eventTitle: 'success-opt-in',
            eventSource: 'registration-process'
          },
        },
        register_success: {
          // Registration step submit button
          register_submit: {
            selector: $('.js-mz-register-submit'),
            eventTitle: 'complete-registration',
            eventSource: 'registration-process'
          }
        }
      };


      // TODO: Track the registration errors and success, then, trigger register_success/register_fail events
      // if ($(".messages.error").length) {
      //   console.log('error triggered');
      // }

      // For each events type, we set parameters
      $.each(events, function (i, event_names) {
        var parameters = {
          eventTitle: '',
          eventSource: '',
          viewType: "modal"
        };

        switch (i) {
          case "click":
            // For each register event, we define the title, source, step and provider if they exist
            $.each(event_names, function (ii, e) {
              $(e.selector, context).once("mze").on("click", function () {
                parameters.eventTitle = (typeof e.eventTitle !== "undefined") ? e.eventTitle : "";
                parameters.eventSource = (typeof e.eventSource !== "undefined") ? e.eventSource : "";

                _mz.emit(_mze.CLICK, parameters);
              });
            });
            break;
          case "register_success":
            // For each register event, we define the title, source, step and provider if they exist
            $.each(event_names, function (ii, e) {
              $(e.selector, context).once("mze").on("click", function () {
                parameters.eventTitle = (typeof e.eventTitle !== "undefined") ? e.eventTitle : "";
                parameters.eventSource = (typeof e.eventSource !== "undefined") ? e.eventSource : "";

                goog_report_conversion();

                _mz.emit(_mze.REGISTER_SUCCESS, parameters);
              });
            });
            break;
          case "register":
            // For each register event, we define the title, source, step and provider if they exist
            $.each(event_names, function (ii, e) {
              $(e.selector, context).once("mze").on("click", function () {
                parameters.eventTitle = (typeof e.eventTitle !== "undefined") ? e.eventTitle : "";
                parameters.eventSource = (typeof e.eventSource !== "undefined") ? e.eventSource : "";

                _mz.emit(_mze.REGISTER, parameters);
              });
            });
            break;
          case "login":
            // For each login event, we define the title and the source if they exist
            $.each(event_names, function (ii, e) {
              $(e.selector, context).once("mze").on("click", function () {
                parameters.eventTitle = (typeof e.eventTitle !== "undefined") ? e.eventTitle : "";
                parameters.eventSource = (typeof e.eventSource !== "undefined") ? e.eventSource : "";

                _mz.emit(_mze.LOGIN, parameters);
              });
            });
            break;
          case "close":
            // For each close event, we define the title, the source and the step if they exist
            $.each(event_names, function (ii, e) {
              $(e.selector, context).once("mze").on("click", function () {
                parameters.eventTitle = (typeof e.eventTitle !== "undefined") ? e.eventTitle : "";
                parameters.eventSource = (typeof e.eventSource !== "undefined") ? e.eventSource : "";

                _mz.emit(_mze.CLOSE, parameters);
              });
            });
            break;
          case "submit":
            // For each submit event, we define the title, the source and the step if they exist
            $.each(event_names, function (ii, e) {
              $(e.selector, context).once("mze").on("click", function () {
                parameters.eventTitle = (typeof e.eventTitle !== "undefined") ? e.eventTitle : "";
                parameters.eventSource = (typeof e.eventSource !== "undefined") ? e.eventSource : "";

                _mz.emit(_mze.SUBMIT, parameters);
              });
            });
            break;
        }
      });
    }
  };

  // Listen for escape key and fire select MZ close tracking.
  $(document).ready(function() {
    $(this).on("keydown", function(event) {
      if (event.key == "Escape") {
        if ($('#user-login .ctools-close-modal').length) {
          var parameters = {
            eventTitle: 'abandon-login',
            eventSource: 'login-process',
            viewType: "modal"
          };
          _mz.emit(_mze.CLOSE, parameters);
        }
        if ($('.js-mz-registration-multistep .ctools-close-modal').length) {

          var abandon_event_title =  convert_stepname_to_eventtitle($(".js-mz-multistep-form").attr("data-step"));

          var parameters = {
            eventTitle: abandon_event_title,
            eventSource: 'registration-process',
            viewType: "modal"
          };
          _mz.emit(_mze.CLOSE, parameters);
        }
      }
    });
  });

  function convert_stepname_to_eventtitle(step_name) {
    var event_title = 'abandon-multistep';
    switch(step_name) {
      case 'welcome':
        event_title = 'identify-provider';
        break;
      case 'registration':
        event_title = 'registration';
        break;
      case 'profile':
        event_title = 'segment';
        break;
      case 'extra_profile':
        event_title = 'extra-profile';
        break;
      case 'newsletters':
        event_title = 'newsletters';
        break;
      case 'guide_download':
        event_title = 'opt-in';
        break;
      case 'student_confirmation':
        event_title = 'guide-download';
        break;
    }
    return event_title;
  }


  /**
   * Sets the google analytics codes.
   */
  var goog_snippet_vars = function () {
    var w = window;
    w.google_conversion_id = 1007358525;
    w.google_conversion_label = "Cia_CNWilGAQvaSs4AM";
    w.google_remarketing_only = false;
  };

  /**
   * Send the event to Google Analytics.
   *
   * DO NOT CHANGE THE CODE BELOW.
   */
  var goog_report_conversion = function (url) {
    goog_snippet_vars();
    window.google_conversion_format = "3";
    window.google_is_call = true;
    var opt = new Object();
    opt.onload_callback = function () {
      if (typeof(url) != 'undefined') {
        window.location = url;
      }
    };
    var conv_handler = window['google_trackConversion'];
    if (typeof(conv_handler) == 'function') {
      conv_handler(opt);
    }
  };

}(jQuery));
;
