(function ($) {
  "use strict";
  $(document).ready(function () {

    var geography_extras = {
      init: function () {
        var _this = this;

        this.regions_map();
        this.best_universities_select();
      },

      // Animation for the Regions Map list
      regions_map: function () {

        // Student Landing Page: Regions Map
        var regions_map = $('.regions-map ul'),
          container = $('.regions-map');
        var slide_distance = (container.outerWidth() - regions_map.outerWidth()) + 95;

        // If map exists
        if (regions_map.length > 0) {

          $('.right-control').on('mouseover', function () {
            regions_map.css({'margin-left': slide_distance});
          });

          $('.left-control').on('mouseover', function () {
            regions_map.css({'margin-left': 0});
          });
        }
      },

      // Functionality for the 'Best Universities' dropdown
      best_universities_select: function () {
        var select = $('.best-universities-select');

        // Reset select on page load
        select.val('default');

        // On select change
        select.on('change', function () {
          // Direct to value unless default
          var chosen_value = $(this).val();
          if (chosen_value != 'default') {
            window.location = chosen_value;
          }
        })
      }
    };

    // Init
    geography_extras.init();
  });
})(jQuery);
;
/**
 * Javascript file for THE Google Ads (DFP)
 */
var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];
(function($) {
  'use strict';

  var slot, show_advert = true;

  /**
   * Defines an advert slot, taking the div attributes as targeting and then stores in Drupal variable, refreshes the
   * advert if the slot already exists.
   *
   * @param $div
   * @returns {boolean}
   */
  function dfp_advert_define_slot($div) {
    var div_id = $div.attr('id');
    var ad_unit = $div.data('adUnit'),
      ad_priority = $div.data('adPriority') || '',
      // Force native strings to be strings.
      ad_native = "" + $div.data('anv') || '',
      ad_native_key = "" + $div.data('ank') || 'strnativekey',
      ad_ranking_type = $div.data('rankingType') || '',
      ad_page = $div.data('adPage') || '',
      ad_key_values = $div.data('adKeyValues') || '',
      ad_refresh = $div.data('adRefresh') || 0,
      out_of_page = $div.data('adOutofpage');

    var size = (window.matchMedia("(max-width: 759px)").matches) ? $div.data('adMobileSize') : $div.data('adSize');

    if (typeof Drupal.settings.the_dfp.slots[div_id] !== 'undefined') {
      slot = Drupal.settings.the_dfp.slots[div_id];
      googletag.pubads().refresh([slot]); // If the slot is already defined, just refresh it.
      return true;
    }

    // Create the slot, outof page has a different call.
    if (typeof out_of_page !== 'undefined') {
      slot = googletag.defineOutOfPageSlot('/' + ad_unit, div_id)
        .addService(googletag.pubads());
    }
    else {
      slot = googletag.defineSlot('/' + ad_unit, size, div_id).addService(googletag.pubads());
    }

    // Set the various targeting.
    if (ad_priority.length) {
      slot.setTargeting("priority", ad_priority);
    }
    if (ad_ranking_type.length) {
      slot.setTargeting("ranking_type", ad_ranking_type);
    }
    if (ad_page.length) {
      slot.setTargeting("page_type", ad_page);
    }
    if (ad_native.length) {
      slot.setTargeting(ad_native_key, ad_native);
    }
    // New targeting of key/value pairs via JS array.
    if (ad_key_values.length && typeof Drupal.settings.the_dfp.keyvalues[ad_key_values] !== 'undefined') {
      $.each(Drupal.settings.the_dfp.keyvalues[ad_key_values], function(key, value) {
        slot.setTargeting(key, value);
      });
    }

    // Add the div id to the slot information.
    slot.the_dfp_id = div_id;

    // Add the slot to Drupal.settings.
    Drupal.settings.the_dfp.slots[div_id] = slot;
  }

  /**
   * Displays an advert slot, taking the div attributes as targeting
   *
   * @param $div
   */
  function dfp_advert_display_slot($div) {
    var div_id = $div.attr('id');
    googletag.cmd.push(function() {
      googletag.display(div_id);
    });
  }

  /**
   * Function that adds a wrapper to an advert and creates the close functionality.
   *
   * @param $div
   */
  function dfp_advert_close_button($div) {
    var ad_position = $div.data('adPosition') || '';
    var div_id = $div.attr('id');
    
    // We'll need our own wrapper for styling purposes.
    var $wrapper = $('<div class="the-dfp__wrapper"></div>').insertBefore($div);
    $div.detach().prependTo($wrapper);

    // Create the close button.
    var $button = $('<div class="the-dfp__close-button the-dfp__close-button--open js-the-dfp__close-button" data-target="' + div_id + '">Close</div>');
    var $container = $div.parent();

    // Full page mobile ad close button requires extra consideration because
    // the time is stays closed can be chosen, and extra styling.
    if(ad_position === 'the_dfp_full_page_mobile') {
      var states = Drupal.behaviors.subNav.getStates(ad_position);
      var now = $.now();
      var show_menu_after = parseInt(states.show_menu);
      // If show_menu is not default and is in the future, then we hide the advert.
      var hide_advert = (show_menu_after > 2 && show_menu_after > now);
      $wrapper.addClass('the-dfp__wrapper--full-page-mobile');

      // Advert is closed so hide button
      if (hide_advert) {
        $div.remove();
        show_advert = false;
      }
      else {
        // User closed the advert ages ago, show it again.
        states.show_menu = 1;
        states.user_closed = 0;
        Drupal.behaviors.subNav.setStates(states, ad_position);
        $button.insertBefore($div);
      }

    } else {
      $button.insertBefore($div);
    }

    // Bind a click handler to the child button of the container to action the clicks.
    $container.on('click', '.js-the-dfp__close-button', function() {
      // Always remove ad in slot
      googletag.destroySlots([Drupal.settings.the_dfp.slots[div_id]]);
      $wrapper.remove();

      if(ad_position === 'the_dfp_full_page_mobile') {
        // Obtain timeout in seconds and convert to ms.
        var timeout = (parseInt($div.data('adLimit')) * 1000);
        states.show_menu = $.now() + timeout;
        states.user_closed = 1;
        Drupal.behaviors.subNav.setStates(states, ad_position);
      }

    });
  }

  // Everything runs on document ready, except dfp script inclusion which is at the bottom of this file.
  $(document).ready(function() {
    // If there are no settings then nothing has been added.
    if (typeof Drupal.settings.the_dfp === 'undefined') {
      return;
    }
    // Initialize our DFP slots array, if not already defined.
    if (typeof Drupal.settings.the_dfp.slots === 'undefined') {
      Drupal.settings.the_dfp.slots = [];
    }

    /**
     * Push commands into the Google queue.
     */
    googletag.cmd.push(function() {

      // Iterate all the dfp elements on page.
      $('.the-dfp').once('the-dfp').each(function() {
        var $div = $(this);

        // Match as per device, allowing exclusion per slot for each device.
        var size = (window.matchMedia("(max-width: 759px)").matches) ? $div.data('adMobileSize') : $div.data('adSize');
        if (size === '' || size === 'exclude') {
          return true;
        }

        // Debug information.
        if (Drupal.settings.the_dfp.enable_debug) {
          console.log($div.data());
        }

        // By default, all adverts show - dfp_advert_close_button() can change this.
        show_advert = true;

        // If limit-use is specified on the div, then we'll add our own close button and limit the amount of time that
        // it can be shown.
        var ad_limit = $(this).data('adLimit') || '';
        if (ad_limit) {
          dfp_advert_close_button($div);
        }

        // Only define the slot (which loads it) if we are in a show state.
        if (show_advert) {
          dfp_advert_define_slot($div);
        }

      });

      // Define and enable services here (after slots are defined).
      if (typeof Drupal.settings.the_dfp.enable_lazyload !== 'undefined' && Drupal.settings.the_dfp.enable_lazyload !== 0) {
        // enableAsyncRendering is required by LazyLoading but it's default so we don't need to declare it.
        // enableSingleRequest does work with LazyLoad (fetches all slots once), but let's give it a go without.
        googletag.pubads().enableLazyLoad({ // does not currently work with collapseEmptyDivs()
          fetchMarginPercent: Number(Drupal.settings.the_dfp.lazyload_fetchMarginPercent),
          renderMarginPercent: Number(Drupal.settings.the_dfp.lazyload_renderMarginPercent),
          mobileScaling: Number(Drupal.settings.the_dfp.lazyload_mobileScaling)
        });
      } else {
        // Support legacy settings (no lazy loading).
        googletag.pubads().enableSingleRequest();
        googletag.pubads().collapseEmptyDivs(true, true);
      }

      // Enable all services once.
      googletag.enableServices();

      // 'Display' (render) all slots after slots and services are defined.
      // If LazyLoad is enabled it will take care of when to render the slots, but still requires the slots to be 'displayed'.
      $('.the-dfp').once('the-dfp-display-slot').each(function() {
        var $div = $(this);
        dfp_advert_display_slot($div);
      });

      // When the slot has finished rendering, set the parent div as a class.
      googletag.pubads().addEventListener('slotRenderEnded', function (event) {
        var div_id = event.slot.getSlotElementId();
        var $div = $('#' + div_id);
        var ad_limit = $div.data('adLimit');
        if (event.isEmpty === false && event.slot.the_dfp_id === div_id && ad_limit) {
          var $parent = $div.parent('.the-dfp__wrapper');
          if ($parent) {
            var sizes = (window.matchMedia("(max-width: 759px)").matches) ? $div.data('adMobileSize') : $div.data('adSize');
            var widths = sizes.map(function(s) {
              return 'width-' + s[0];
            });
            $.unique(widths.sort());
            var classes = widths.join(' ');
            $parent.removeClass(classes);
            $parent.addClass('width-' + event.size[0]);
          }
        }
        // Add class if slot doesn't return an advert, used for hiding empty ads
        // when using LazyLoading as collapseEmptyDivs doesn't work with it or
        // rogue empty full page mobile ads.
        var $parent = $div.parent('.the-dfp__wrapper');
        if (event.isEmpty === true) {
          if($parent) {
            $parent.addClass('the-dfp--empty');
          }
          $div.addClass('the-dfp--empty');
        } else {
          if($parent) {
            $parent.addClass('the-dfp--rendered');
          }
          $div.addClass('the-dfp--rendered');
        }
      });

      if (typeof Drupal.settings.the_dfp.enable_autorefresh !== 'undefined' && Drupal.settings.the_dfp.enable_autorefresh !== 0) {
        var refresh_time = Number(Drupal.settings.the_dfp.autorefresh_time);
        // event triggers when slot comes into view.
        googletag.pubads().addEventListener('impressionViewable', function (event) {
          var div_id = event.slot.getSlotElementId();
          var $div = $('#' + div_id);
          var ad_refresh = $div.data('adRefresh');
          // To mark a slot for in-page refresh, give it data-ad-refresh=1 attribute.
          // Ensure the slot if still refreshable (i.e. hasn't been closed).
          if (ad_refresh) {
            var timer = setTimeout(function () {
              // If already defined (which it is) will refresh the slot.
              dfp_advert_define_slot($div);
            }, refresh_time);
          }
        });
      }

    });
  });

  /**
   * DFP Script include.
   *
   * This is the standard google include for inserting the DFP script.
   * In addition, the native sharethrough script is also loaded if an element requires it.
   *
   * We also use once() to ensure that this does not get run more than once.
   */
  $('body').once('dfp').ready(function()  {
    var gads = document.createElement('script');
    gads.async = true;
    gads.type = 'text/javascript';
    var useSSL = 'https:' == document.location.protocol;
    gads.src = (useSSL ? 'https:' : 'http:') + '//www.googletagservices.com/tag/js/gpt.js';
    var node = document.getElementsByTagName('script')[0];
    node.parentNode.insertBefore(gads, node);
  });

})(jQuery);
;
