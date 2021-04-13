/**
 * @file
 * Javscript file for loading MZ Analytics tracking file.
 */

(function ($) {
  'use strict';
  /**
   * Binds to the register and login modals so that when they are closed by any means
   * (pressing escape or clicking off), it will trigger the close button within itself,
   * thus invoking the MZ methods.
   */
  // TODO: Equivalent for this for new ctools login/register modal.
  // $('#registerModal, #loginModal').once('mze').on('hidden.bs.modal', function (e) {
  //   $(this).find('button.close[data-dismiss="modal"]').trigger('click');
  // });

  /**
   * Implements behaviours for adding MZ attributes to dynamic elements.
   *
   * Behaviours are required for the modal buttons which update via ajax and the rankings datatables modal buttons as
   * the table rows are generated dynamically.
   */
  Drupal.behaviors.mzAnalyticsEventsBehaviour = {
    attach: function (context) {

      // Attach to all modal links, including the submit buttons.
      _mz_analytics_attach_modal_tracking(context);
      // Attach to rankings table filters and pagination for event tracking.
      _mz_analytics_attach_rankings_tracking(context);
      // Attach to save basket buttons.
      _mz_analytics_attach_save_basket(context);
      // Attach social link events.
      _mz_analytics_attach_social_tracking(context);
      // Attach article tag events.
      _mz_analytics_attach_tags_tracking(context);
      // Attach university profile events.
      _mz_analytics_attach_university_profile_tracking(context);
      // Attach youtube player events.
      _mz_analytics_attach_video_player_tracking(context);
      // Attach to file downloads.
      _mz_analytics_attach_file_download_tracking(context);
      // Attach to subs form submit /subscriptions/find-out-more
      _mz_analytics_attach_b2b_form_enquire(context);
    }
  };

  /**
   * Attaches on profile pages.
   */
  var _mz_analytics_attach_university_profile_tracking = function (context) {
    // Binds to the sub navigation on profiles.
    $("ul.sub-nav li a.js-scroll-to-element", context).once('mze').on('click', function () {
      var type = this.text.toLowerCase();
      _mz.emit(_mze.CLICK, {
        'eventTitle': 'profile subnav',
        'module': {
          name: 'subnav',
          type: type
        }
      });
    });
  };

  /**
   * Attaches to Read more article tags to send an event to MZ.
   */
  var _mz_analytics_attach_tags_tracking = function (context) {
    // Iterate all the tags on the page.
    $('.article-tags .field-type-taxonomy-term-reference .field-item', context).each(function () {
      $(this).find('a').attr('data-mz', '');
      $(this).find('a').attr('data-module', 'article-tags');
      $(this).find('a').attr('data-position', "article-tags-bottom");
    });
  };

  /**
   * Attaches to Social links to send a share event to MZ.
   */
  var _mz_analytics_attach_social_tracking = function (context) {
    // Iterate all social links on a page.
    $('ul.soc li a', context).each(function () {
      // Remove any exit links that may exist.
      $(this).removeAttr('data-mz');
      // Bind to the click event for links.
      $(this).once('mze').on('click', function () {
        // Send to MZ, as per: https://github.com/tes/mz/wiki/Social-media-shares.
        _mz.emit(_mze.CLICK, {
          'eventTitle': 'share',
          'module': {
            'type': 'social',
            'name': $(this).data('network')
          }
        });
      });
    });

  };

  /**
   * Attaches to Save your basket click for MZ submission events.
   */
  var _mz_analytics_attach_save_basket = function (context) {
    $("#wur-lists-list-basket-form .form-submit", context).once('mze').on('click', function () {
      if (!$(".view-wur-list-basket").length) {
        return;
      }
      var list = $(".view-wur-list-basket .views-field-title a");
      var basket = [];
      $.each(list, function (i, e) {
        basket.push($(e).text());
      });
      _mz.emit(_mze.SUBMIT, {
        // eventTitle: "Add To List / Remove from List / Login Modal / Save List",
        eventTitle: $(this).val().toLowerCase(),
        basketItems: basket,
        viewType: $(this).val().toLowerCase()
      });

    });
  };

  /**
   * Attaches to /subscriptions/find-out-more B2B form submit
   */
  var _mz_analytics_attach_b2b_form_enquire = function (context) {
    $("#the-corporate-subscriber-weblead-form", context).once('mze').on('submit', function () {
      // Some very very basic form validation to reduce the number of false positives we fire.
      // Form validation needs looking at sitewide.
      if( $('#the-corporate-subscriber-weblead-form input.form-control.required').filter(function() { return this.value === ''; }).length === 0 ) {
        _mz.emit(_mze.SUBMIT, {
          eventTitle: 'THEMagazine',
          eventSource: 'B2BLead',
          eventGtagGoalID: '7YK7CImqjscBELCzuvoC'
        });
      }
    });
  };

  /**
   * Attaches tracking to Rankings table filters, pagination and other actions.
   */
  var _mz_analytics_attach_rankings_tracking = function (context) {
    // Send an action when users toggle the body text on rankings table pages.
    $('[href="#collapse_text"]').once('mze').on('click', function () {
      var parameters = {
        eventTitle: 'read more',
        viewType: 'toggle',
        module: {
          name: 'rankings_body',
          type: ($(this).html() == 'Read more...') ? 'open' : 'close'
        }
      };
      _mz.emit(_mze.CLICK, parameters);
    });
    // Special case for name/title search, as we dont want to track every keyup event.
    $(".pane-the-data-rankings-sentence-form #edit-name", context).once('mze').on('blur', function () {
      // Track ALL name searches, including when 'reset'.
      _mz_wur_search();
    });

    // Refresh DFP ads for pagination changes.
    $(".dataTables_paginate .paginate_button", context).once('mz-page').on('click', function () {
      googletag.pubads().refresh();
    });

    // Get the datatables selector.
    if (Drupal.settings.datatables) {
      var selector = Object.keys(Drupal.settings.datatables)[0] || '#datatable-1';
      // Bind to the datatable init callback, so draw only runs after initialisation.
      $(selector, context).once('mze').on('init.dt', context, function () {
        // Bind to the datatable draw callback, to send to MZ.
        $(selector, context).on('draw.dt', function () {
          // What we dont want is to send data for every keypress on searches.
          if ($(document.activeElement).attr('id') === 'edit-title') {
            return;
          }
          // Simply call our helper function to send data to MZ.
          if (typeof _mz != 'undefined') {
            _mz_wur_search();
          }
        });
      });
    }
  };

  /**
   * Attaches click event handlers for MZ on modals and their submits.
   */
  var _mz_analytics_attach_modal_tracking = function (context) {
    // All the modal actions we want to bind click handlers for.
    var modals = {
      /*
       * Authenticated users.
       */
      // Add to list links such as on profile and ranking pages.
      add_to_list: {
        selector: $('a[data-target="#add-to-list-modal"]'),
        eventTitle: 'add to list',
        eventSource: 'add to list',
        eventType: 'click'
      },
      // View added to list basket, in bottom right corner.
      view_add_to_list_basket: {
        selector: $('button[data-target="#add-to-list-modal"]'),
        eventTitle: 'view list',
        eventSource: 'view list',
        eventType: 'click'
      },
      // Save to basket from view basket modal.
      modal_save_list: {
        selector: $('a[href$="/basket"]'),
        eventTitle: 'save list',
        eventSource: 'view basket',
        eventType: 'click'
      },
      // Save list from checkout page.
      save_list: {
        selector: $('form#wur-lists-list-basket-form button'),
        eventTitle: 'save to list',
        eventSource: 'checkout',
        eventType: 'click'
      }
    };

    // All anchored hrefs.. hmmm?
    // console.log($('a[href*="#"]', context));

    // Iterate the modal array and set the handlers which it defines.
    $.each(modals, function (i, e) {
      $(e.selector, context).once('mze').on(e.eventType, function () {
        // Set the default parameters.
        var parameters = {
          eventTitle: e.eventTitle,
          viewType: e.viewType || 'modal',
          module: {}
        };


        // Some events require additional processing.
        // TODO: add case for close_login_reg_modal and figure out if it's login or register.
        switch (i) {
          case 'add_to_list':
            // Add to list can be from various places.
            if ($(this).closest('.pane-add-to-list.profile-title') !== 'undefined') {
              parameters.eventSource = 'university profile';
            }
            else if ($(this).closest('.view-wur-list-basket').length) {
              parameters.eventSource = 'add to list checkout';
            }
            // The link title indicates whether this is an add or remove.
            if ($(this).attr('title')) {
              parameters.eventTitle = $(this).attr('title').toLowerCase();
            }
            break;

          case 'save_list':
            var event_title = $(this).val().toLowerCase().trim().replace('\(s\)', '');
            // Change viewType from modal to something else.
            parameters.viewType = 'basket';
            parameters.eventTitle = event_title;
            break;
        }

        // Send the event with our parameters to MZ.
        _mz.emit(_mze.SUBMIT, parameters);
      });
    });
  };

  /**
   * Helper function that reads the datatable choices.
   */
  var _mz_wur_search = function () {
    var selector = Object.keys(Drupal.settings.the_data_rankings)[0] || '#datatable-1';
    // Obtain the settings and api for this datatable instance.
    var settings = Drupal.settings.the_data_rankings[selector];
    var api = new $.fn.dataTable.Api(selector);

    var order = api.order();
    // If a search was not performed, used defaults from settings.
    if (typeof order === 'undefined') {
      order = settings.order;
    }
    var sort_by = settings.columns[order[0][0]].data;
    var sort_order = order[0][1];

    var countries = [];
    $("#views-exposed-form-the-wur-datatables-panel-pane-1 #edit-field-institution-iso-country-tid option:selected").each(function (i, e) {
      countries.push($(e).text());
    });

    var params_to_track = {
      eventTitle: 'search filter',
      filterPagination: api.page(),
      filterName: api.search(),
      filterCountry: countries,
      filterSubject: $("#views-exposed-form-the-wur-datatables-panel-pane-1 #edit-field-subjects-offered-tid option:selected").val(),
      filterYear: $("#ctools-jump-menu #edit-jump option:selected").text().trim(),
      viewType: $(".view-the-wur-datatables input[name='display']:checked").val(),
      sortOrder: sort_order,
      sortBy: sort_by,
      itemsPerPage: datatable.page.len()
    };
    _mz.emit(_mze.SUBMIT, params_to_track);
  };

  /**
   * Attaches to youtube player events.
   */
  var _mz_analytics_attach_video_player_tracking = function (context) {
    $(document).on("youtubeapi:end", function(event, parameters) {
      _mz.emit(_mze.END, parameters);
    });
    $(document).on("youtubeapi:play", function(event, parameters) {
      _mz.emit(_mze.PLAY, parameters);
    });
    $(document).on("youtubeapi:pause", function(event, parameters) {
      _mz.emit(_mze.PAUSE, parameters);
    });
    $(document).on("vimeoapi:end", function(event, parameters) {
      _mz.emit(_mze.END, parameters);
    });
    $(document).on("vimeoapi:play", function(event, parameters) {
      _mz.emit(_mze.PLAY, parameters);
    });
    $(document).on("vimeoapi:pause", function(event, parameters) {
      _mz.emit(_mze.PAUSE, parameters);
    });
  };

  /**
   * Attaches to file downloads.
   */
  var _mz_analytics_attach_file_download_tracking = function (context) {

    $("a[data-module='profile-attachment-download'], div[data-module='profile-attachment-download'] a", context)
      .on('click', function() {
      // Update link to open in new window.
      $(this).attr("target", "_blank");
      // Transmit to mz, as per: https://github.com/tes/mz/wiki/Download-documents.
      _mz.emit(_mze.DOWNLOAD, {
        downloadType: "profile.attachment",
        attachment: {
          id: $(this).data("attachment"),
          name: $(this).data("title"),
          filetype: $(this).data("fileextension"),
          attachmenttype: "attachment"
        }
      });
    });

  };

  /**
   * mz.pageViewProperties:loaded
   * see README.md
   */
  $(document).on("mz.pageViewProperties:loaded", function () {
    window.TES = window.TES || {};

    // Check if we have survey cookie, if yes set it to pageMetadata.mode
    var surveyCookieAnswer = $.cookie("surveyAnswer");
    if (surveyCookieAnswer) {
      window.TES.pageMetadata.mode = surveyCookieAnswer;
    }

    // Track impressions on page view.
    if (Drupal.settings.theImpressionsTracking && Drupal.settings.theImpressionsTracking.impressions) {
      window.TES.pageMetadata.impressions = Drupal.settings.theImpressionsTracking.impressions;
      // @TODO: If we're ajaxing this will we need to re-trigger the event?
    }
  })
}(jQuery));
;
(function ($) {
  "use strict";
  Drupal.behaviors.theModals = {
    attach: function (context) {

    }
  };

  Drupal.ajax.prototype.commands.loginModalReload = function (ajax, response, status) {
    location.href = location.href;
  };

  Drupal.ajax.prototype.commands.loginModalRedirect = function (ajax, response, status) {
    location.href = response.href;
  };

  Drupal.ajax.prototype.commands.loginModalDestination = function (ajax, response, status) {
    location.href = response.href;
  };

})(jQuery);
;
/**
 * @file
 * A dumping ground for cheap dumb hacks that should be fixed properly.
 *
 * @TODO: Don't be so haxy.
 */

(function ($, Drupal, window, document, undefined) {
  'use strict';
  Drupal.behaviors.theHacks = {
    /**
     * Gives Youtube iFrames better respsonsive-ness.
     */
    responsiveIframe: function responsiveIframe() {
      var iframeSrcMatch = this.src.indexOf('www.youtube.com');
      if (iframeSrcMatch > -1) {
        $(this).wrap('<div class="media-youtube-video"></div>');
      }
    },

    /**
     * Method will be called when anything is attached to DOM.
     */
    attach: function (context, settings) {
      // Responsive handling of Youtube videos in iframes.
      $('iframe', context).each(this.responsiveIframe);

      // wrapper div inside bottom div to do nested rows.
      $('.node-type-ranking-institution .bootstrap-twocol-stacked .bottom', context).wrapInner('<div class="bottom-inner"></div>');

      // Responsive tables handling for wysiwyg' added tables.
      $(".page-node .pane-node-field-body table", context).wrap("<div class='table-responsive'></div>");

      // Add custom ID so we can target better.
      $(".pane-node-comments", context).attr("id", "node-comments");

      // Scroll to comment: Give the panel wrapper social links an 'id'.
      $('.pane-node-comment-form', context).attr('id', 'comment-form-anchor');
    }
  };
})(jQuery, Drupal, this, this.document);
;
/**
 * @file
 * Behaviours for the THE main nav bar found on all pages
 *
 */

(function ($, Drupal, window, document, undefined) {
  'use strict';
  Drupal.behaviors.navMain = {

    /**
     * Method will be called when anything is attached to DOM.
     */
    attach: function (context, settings) {

      stickybits('#navbar.js-sticky-nav', {useStickyClasses: true});

      // Add angle chevron to dropdown menu
      if (window.matchMedia("(max-width: 767px)").matches) {
        $('.dropdown-toggle', context).append('<div class="navbar-nav__chevron"></div>'); // replace caret with angle icon
      }
    }
  };
})(jQuery, Drupal, this, this.document);
;
/*! jssocials - v1.4.0 - 2016-10-10
* http://js-socials.com
* Copyright (c) 2016 Artem Tabalin; Licensed MIT */
!function(a,b,c){function d(a,c){var d=b(a);d.data(f,this),this._$element=d,this.shares=[],this._init(c),this._render()}var e="JSSocials",f=e,g=function(a,c){return b.isFunction(a)?a.apply(c,b.makeArray(arguments).slice(2)):a},h=/(\.(jpeg|png|gif|bmp|svg)$|^data:image\/(jpeg|png|gif|bmp|svg\+xml);base64)/i,i=/(&?[a-zA-Z0-9]+=)?\{([a-zA-Z0-9]+)\}/g,j={G:1e9,M:1e6,K:1e3},k={};d.prototype={url:"",text:"",shareIn:"blank",showLabel:function(a){return this.showCount===!1?a>this.smallScreenWidth:a>=this.largeScreenWidth},showCount:function(a){return a<=this.smallScreenWidth?"inside":!0},smallScreenWidth:640,largeScreenWidth:1024,resizeTimeout:200,elementClass:"jssocials",sharesClass:"jssocials-shares",shareClass:"jssocials-share",shareButtonClass:"jssocials-share-button",shareLinkClass:"jssocials-share-link",shareLogoClass:"jssocials-share-logo",shareLabelClass:"jssocials-share-label",shareLinkCountClass:"jssocials-share-link-count",shareCountBoxClass:"jssocials-share-count-box",shareCountClass:"jssocials-share-count",shareZeroCountClass:"jssocials-share-no-count",_init:function(a){this._initDefaults(),b.extend(this,a),this._initShares(),this._attachWindowResizeCallback()},_initDefaults:function(){this.url=a.location.href,this.text=b.trim(b("meta[name=description]").attr("content")||b("title").text())},_initShares:function(){this.shares=b.map(this.shares,b.proxy(function(a){"string"==typeof a&&(a={share:a});var c=a.share&&k[a.share];if(!c&&!a.renderer)throw Error("Share '"+a.share+"' is not found");return b.extend({url:this.url,text:this.text},c,a)},this))},_attachWindowResizeCallback:function(){b(a).on("resize",b.proxy(this._windowResizeHandler,this))},_detachWindowResizeCallback:function(){b(a).off("resize",this._windowResizeHandler)},_windowResizeHandler:function(){(b.isFunction(this.showLabel)||b.isFunction(this.showCount))&&(a.clearTimeout(this._resizeTimer),this._resizeTimer=setTimeout(b.proxy(this.refresh,this),this.resizeTimeout))},_render:function(){this._clear(),this._defineOptionsByScreen(),this._$element.addClass(this.elementClass),this._$shares=b("<div>").addClass(this.sharesClass).appendTo(this._$element),this._renderShares()},_defineOptionsByScreen:function(){this._screenWidth=b(a).width(),this._showLabel=g(this.showLabel,this,this._screenWidth),this._showCount=g(this.showCount,this,this._screenWidth)},_renderShares:function(){b.each(this.shares,b.proxy(function(a,b){this._renderShare(b)},this))},_renderShare:function(a){var c;c=b.isFunction(a.renderer)?b(a.renderer()):this._createShare(a),c.addClass(this.shareClass).addClass(a.share?"jssocials-share-"+a.share:"").addClass(a.css).appendTo(this._$shares)},_createShare:function(a){var c=b("<div>"),d=this._createShareLink(a).appendTo(c);if(this._showCount){var e="inside"===this._showCount,f=e?d:b("<div>").addClass(this.shareCountBoxClass).appendTo(c);f.addClass(e?this.shareLinkCountClass:this.shareCountBoxClass),this._renderShareCount(a,f)}return c},_createShareLink:function(a){var c=this._getShareStrategy(a),d=c.call(a,{shareUrl:this._getShareUrl(a)});return d.addClass(this.shareLinkClass).append(this._createShareLogo(a)),this._showLabel&&d.append(this._createShareLabel(a)),b.each(this.on||{},function(c,e){b.isFunction(e)&&d.on(c,b.proxy(e,a))}),d},_getShareStrategy:function(a){var b=m[a.shareIn||this.shareIn];if(!b)throw Error("Share strategy '"+this.shareIn+"' not found");return b},_getShareUrl:function(a){var b=g(a.shareUrl,a);return this._formatShareUrl(b,a)},_createShareLogo:function(a){var c=a.logo,d=h.test(c)?b("<img>").attr("src",a.logo):b("<i>").addClass(c);return d.addClass(this.shareLogoClass),d},_createShareLabel:function(a){return b("<span>").addClass(this.shareLabelClass).text(a.label)},_renderShareCount:function(a,c){var d=b("<span>").addClass(this.shareCountClass);c.addClass(this.shareZeroCountClass).append(d),this._loadCount(a).done(b.proxy(function(a){a&&(c.removeClass(this.shareZeroCountClass),d.text(a))},this))},_loadCount:function(a){var c=b.Deferred(),d=this._getCountUrl(a);if(!d)return c.resolve(0).promise();var e=b.proxy(function(b){c.resolve(this._getCountValue(b,a))},this);return b.getJSON(d).done(e).fail(function(){b.get(d).done(e).fail(function(){c.resolve(0)})}),c.promise()},_getCountUrl:function(a){var b=g(a.countUrl,a);return this._formatShareUrl(b,a)},_getCountValue:function(a,c){var d=(b.isFunction(c.getCount)?c.getCount(a):a)||0;return"string"==typeof d?d:this._formatNumber(d)},_formatNumber:function(a){return b.each(j,function(b,c){return a>=c?(a=parseFloat((a/c).toFixed(2))+b,!1):void 0}),a},_formatShareUrl:function(b,c){return b.replace(i,function(b,d,e){var f=c[e]||"";return f?(d||"")+a.encodeURIComponent(f):""})},_clear:function(){a.clearTimeout(this._resizeTimer),this._$element.empty()},_passOptionToShares:function(a,c){var d=this.shares;b.each(["url","text"],function(e,f){f===a&&b.each(d,function(b,d){d[a]=c})})},_normalizeShare:function(a){return b.isNumeric(a)?this.shares[a]:"string"==typeof a?b.grep(this.shares,function(b){return b.share===a})[0]:a},refresh:function(){this._render()},destroy:function(){this._clear(),this._detachWindowResizeCallback(),this._$element.removeClass(this.elementClass).removeData(f)},option:function(a,b){return 1===arguments.length?this[a]:(this[a]=b,this._passOptionToShares(a,b),void this.refresh())},shareOption:function(a,b,c){return a=this._normalizeShare(a),2===arguments.length?a[b]:(a[b]=c,void this.refresh())}},b.fn.jsSocials=function(a){var e=b.makeArray(arguments),g=e.slice(1),h=this;return this.each(function(){var e,i=b(this),j=i.data(f);if(j)if("string"==typeof a){if(e=j[a].apply(j,g),e!==c&&e!==j)return h=e,!1}else j._detachWindowResizeCallback(),j._init(a),j._render();else new d(i,a)}),h};var l=function(a){var c;b.isPlainObject(a)?c=d.prototype:(c=k[a],a=arguments[1]||{}),b.extend(c,a)},m={popup:function(c){return b("<a>").attr("href","#").on("click",function(){return a.open(c.shareUrl,null,"width=600, height=400, location=0, menubar=0, resizeable=0, scrollbars=0, status=0, titlebar=0, toolbar=0"),!1})},blank:function(a){return b("<a>").attr({target:"_blank",href:a.shareUrl})},self:function(a){return b("<a>").attr({target:"_self",href:a.shareUrl})}};a.jsSocials={Socials:d,shares:k,shareStrategies:m,setDefaults:l}}(window,jQuery),function(a,b,c){b.extend(c.shares,{email:{label:"E-mail",logo:"fa fa-at",shareUrl:"mailto:{to}?subject={text}&body={url}",countUrl:"",shareIn:"self"},twitter:{label:"Tweet",logo:"fa fa-twitter",shareUrl:"https://twitter.com/share?url={url}&text={text}&via={via}&hashtags={hashtags}",countUrl:""},facebook:{label:"Like",logo:"fa fa-facebook",shareUrl:"https://facebook.com/sharer/sharer.php?u={url}",countUrl:"https://graph.facebook.com/?id={url}",getCount:function(a){return a.share&&a.share.share_count||0}},vkontakte:{label:"Like",logo:"fa fa-vk",shareUrl:"https://vk.com/share.php?url={url}&title={title}&description={text}",countUrl:"https://vk.com/share.php?act=count&index=1&url={url}",getCount:function(a){return parseInt(a.slice(15,-2).split(", ")[1])}},googleplus:{label:"+1",logo:"fa fa-google",shareUrl:"https://plus.google.com/share?url={url}",countUrl:""},linkedin:{label:"Share",logo:"fa fa-linkedin",shareUrl:"https://www.linkedin.com/shareArticle?mini=true&url={url}",countUrl:"https://www.linkedin.com/countserv/count/share?format=jsonp&url={url}&callback=?",getCount:function(a){return a.count}},pinterest:{label:"Pin it",logo:"fa fa-pinterest",shareUrl:"https://pinterest.com/pin/create/bookmarklet/?media={media}&url={url}&description={text}",countUrl:"https://api.pinterest.com/v1/urls/count.json?&url={url}&callback=?",getCount:function(a){return a.count}},stumbleupon:{label:"Share",logo:"fa fa-stumbleupon",shareUrl:"http://www.stumbleupon.com/submit?url={url}&title={title}",countUrl:"https://cors-anywhere.herokuapp.com/https://www.stumbleupon.com/services/1.01/badge.getinfo?url={url}",getCount:function(a){return a.result.views}},telegram:{label:"Telegram",logo:"fa fa-paper-plane",shareUrl:"tg://msg?text={url} {text}",countUrl:"",shareIn:"self"},whatsapp:{label:"WhatsApp",logo:"fa fa-whatsapp",shareUrl:"whatsapp://send?text={url} {text}",countUrl:"",shareIn:"self"},line:{label:"LINE",logo:"fa fa-comment",shareUrl:"http://line.me/R/msg/text/?{text} {url}",countUrl:""},viber:{label:"Viber",logo:"fa fa-volume-control-phone",shareUrl:"viber://forward?text={url} {text}",countUrl:"",shareIn:"self"},pocket:{label:"Pocket",logo:"fa fa-get-pocket",shareUrl:"https://getpocket.com/save?url={url}&title={title}",countUrl:""},messenger:{label:"Share",logo:"fa fa-commenting",shareUrl:"fb-messenger://share?link={url}",countUrl:"",shareIn:"self"}})}(window,jQuery,window.jsSocials);;
/**
 * @file
 * Javscript file for loading MZ Analytics tracking file.
 */
(function ($) {

  /**
   * Perform all the things that require the document to be ready.
   */
  $(document).ready(function () {

    // First and foremost, ensure all external links are trackable.
    _mz_analytics_page_track_external();

    // Obtains the page meta data which contains the MZ data.
    window.TES = window.TES || {};
    var pageMetadata = {};
    var a = document.getElementsByTagName('meta');
    for (var i = 0; i < a.length; i++) {
      var p = a[i].getAttribute("property");
      if (p) {
        p.toString();
        if (p.indexOf('mz') > -1) {
          var content = a[i].getAttribute("content");
          var mz_property = p.replace('mz:', '');
          pageMetadata[mz_property] = content.toLowerCase();
        }
      }
    }

    var mz_variables = Drupal.settings.mz_variables;

    // Pass in all page variables set by modules.
    $.extend(pageMetadata, mz_variables.page_variables);
    window.TES.pageMetadata = pageMetadata;

    // TODO: Cry, what is this and why does it run?
    if (mz_variables.mz_domain !== 'https://www.tes.com') {
      window.TES.userMetadata = mz_variables.user_variables;
    }
    window.TES.domain = mz_variables.mz_domain;

    // Allow other scripts to modify TES.pageMetadata before the pageView event.
    $(document).trigger("mz.pageViewProperties:loaded");

    var admin_tracking = mz_variables.admin_tracking;
    if (typeof admin_tracking !== 'undefined' && admin_tracking) {
      $('[data-mz]').prepend('<span class="mz-marker"></span>');
    }

    /**
     * Allow the MZ script to be cached by the browser by providing our own function to fetch the data.
     *
     * http://api.jquery.com/jQuery.getScript/
     */
    $.cachedScript = function (url, options) {
      // Allow user to set any option except for dataType, cache, and url.
      options = $.extend(options || {}, {
        dataType: "script",
        cache: true,
        url: url
      });
      // Use $.ajax() since it is more flexible than $.getScript.
      // Return the jqXHR object so we can chain callbacks.
      return $.ajax(options);
    };

    if (mz_variables.mz_events_separate) {
      $.cachedScript(mz_variables.mz_events_separate);
    }

    /**
     * The actual call to get the script using our custom function, performing a MZ page emit on ajax done.
     *
     * In order to use the custom events, simply bind to either event 'mz.cachedScript:loaded' or
     * 'mz.cachedScript:done'
     *
     * $(document).on("mz.cachedScript:loaded", function( event ) {
     *   console.log('mz.cachedScript:loaded');
     * }).on("mz.cachedScript:done", function( event ) {
     *   console.log('mz.cachedScript:done');
     * });
     */
    $.cachedScript(mz_variables.mz_script).done(function (script, textStatus) {
      // Now that the script has loaded, we allow other code to do something.
      $(document).trigger("mz.cachedScript:loaded");
      // Now perform the MZ Page View method.
      _mz.emit(_mze.PAGE_VIEW);
      // Finally we trigger a done.
      $(document).trigger("mz.cachedScript:done");
    });

  });

  /**
   * Searches for and track external links not altered by mz_analytics_preprocess_link().
   *
   * @private
   */
  var _mz_analytics_page_track_external = function () {
    // Select all 'a' elements with an absolute href;
    $("a[href^=\'http\'],a[href^=\'www\']")
    // And not already tagged with data-mz;
        .not("[data-mz]")
        // And not this domain;
        .not("[href*=\'" + window.location.hostname + "\']")
        // And not already processed.
        .not(".processed")
        .each(function (i, e) {
          // External links are tracked by simply adding "data-mz" to the link element.
          $(e).addClass("processed").attr({
            "data-mz": ""
          });
        });
  };


}(jQuery));
;
// - http://www.adequatelygood.com/2010/3/JavaScript-Module-Pattern-In-Depth
(function ($) {
  "use strict";
  Drupal.behaviors.the_nag_footer = {
    attach: function (context) {
      // Student CTA nag trumps all
      var $student_nag = $('.js-student-guide-nag');
      var student_nag_cookie = $.cookie('studentCTANag');
      if ($student_nag.length === 1 && student_nag_cookie !== 'true') {
        return;
      }

      // The Student Wall nag also trumps this
      var $student_wall_nag = $('.js-student-wall-nag');
      var student_wall_cookie = $.cookie('studentWallNag');
      if ($student_wall_nag.length === 1 && student_wall_cookie !== 'true') {
        return;
      }


      $(".js-the-nag-footer", context).once('js-the-nag-footer', function() {
        var $nag_footer = $(this);
        var $nag_content = $('.js-the-nag-footer__content');
        var nag_height = $nag_content.outerHeight();

        var updateNagFooterPosition = function(position) {
          $nag_footer.css('bottom', position + 'px');
        };

        // Scrolling to Npx makes the block appear.
        $(document).scroll(function () {
          // Keep checking nag_height as dfp ads take a little bit of time to load.
          nag_height = $nag_content.outerHeight();

          // If we scroll past trigger point, move nag footer into view.
          var h = (Drupal.settings.thenf.start.length) ? parseInt(Drupal.settings.thenf.start) : 800;
          var y = $(this).scrollTop();
          if (y > h) {
            $nag_footer.css({'visibility':'visible'}).once('show-nag');
            updateNagFooterPosition(0);
          } else {
            updateNagFooterPosition(-nag_height-16);
          }

        });

      });
    }
  };
}(jQuery));
;
