/**
 * @file
 * JavaScript to be used on every page in this theme.
 *
 * NOTE: Use this sparingly.
 */

(function ($, Drupal, window, document, undefined) {
  'use strict';

  function throttle(fn, delay) {
    var timeout;
    return function() {
      var args = arguments;
      var context = this;
      if (!timeout) {
        timeout = setTimeout(function() {
          timeout = 0;
          return fn.apply(context, args)
        }, delay);
      }
    };
  }

  // Add to the Function function constructor
  Function.prototype.throttle = function(delay) {
    return throttle(this, delay);
  };

  Drupal.behaviors.theGlobal = {
    /**
     * Scroll to element on page
     */
    scrollToElement: function scrollToElement($element) {
      // Set Buffer, increased if admin menu exists
      var buffer = $('body').hasClass('admin-menu') ? 140 : 120;

      // Animate scroll to on target
      $('html, body').animate({
        scrollTop: $element.offset().top - buffer
      }, 500);
    },

    /**
     * On click, check if hash matches an element > then scroll to element
     */
    onClickScrollToElement: function onClickScrollToElement(link, event) {
      event.preventDefault();

      // Get target from href
      var href = $(link).attr('href'),
        // If the href is not a path to another page (i.e. /new-page#hash vs #hash)
        // isNotPath = href.indexOf('/#') < 0,
        $element = $(href).length > 1 ? $(href) : $('.' + href.substring(1));
        var $alt_element = $(href).length > 1 ? $(href) : $('#' + href.substring(1));

      // If exists
      if ($element.length) {
        // Scroll to element
        Drupal.behaviors.theGlobal.scrollToElement($element);
      }
      // Allow stand alone hash links, like on /terms-and-conditions.
      else if ($alt_element.length) {
        Drupal.behaviors.theGlobal.scrollToElement($alt_element);
      }
      // Else redirect the page to the full link path
      else {
        window.location = href;
      }
    },

    /**
     * On load, check if hash matches an element > then scroll to element
     */
    onLoadScrollToElement: function onLoadScrollToElement(hash) {
      try {
        var $element = $('.' + hash.substring(1));
        // If element exists.
        if ($element.length) {
          // Scroll to element.
          Drupal.behaviors.theGlobal.scrollToElement($element);
        }

      }
      catch (error) {
        // Hash is not a valid DOM element.. do nothing.
      }
    },

    /**
     * Fix broken images by loading default when broken.
     * @TODO: Pass theme path as a setting. Never rely on '/sites/default/themes/'.
     */
    fixBrokenImages: function fixBrokenImages() {
      $(this).attr('src', '/sites/default/themes/custom/the_responsive/img/logo/logo-article-placeholder.jpg');
    },

    /**
     * Used to add 'read more/less' to ANY content that uses <p> tag.
     *
     * Usage options in order of importance/priority in code:
     *
     * 1) Write string [[READMORE]] into wysiwyg content
     * 2) Set collapse paragraphs through data attribute - see the_locations_location_description_content_type_render() for example
     * 3) Set collapse height through data attribute - see the_institution_profiles_panels_pane_content_alter() for example
     * 4) Default collapse_height if attribute is set but value errors.
     */
    readMore: function readMore(context) {
      // Find element by 'data' attribute
      $('div[data-js-read-more]', context).once('read-more', function () {
        var collapse_height = 400; // Default.
        var paragraph_num;
        var read_more_attribute = $(this).attr('data-js-read-more'),
          override_string = '[[READMORE]]',
          override_string_exists = $(this).html().indexOf(override_string) > -1;

        // First, determine if a '[[READ MORE]]' string is within the content.
        // This overrides the proceeding conditions of 'paragraph' length or 'height'
        // and instead uses the position of the 'override_string' in the text as
        // the breakpoint.
        if (override_string_exists) {
          paragraph_num = $("p:contains('" + override_string + "')").index();
          // Get collapse height from paragraph number
          collapse_height = Drupal.behaviors.theGlobal.getCollapseHeight($(this), paragraph_num);
        }
        // Next, Else If the data-js-read-more attribute is of 'paragraph' type
        else if (read_more_attribute.indexOf('paragraphs') == 0) {
          // Get paragraph number set in data attr
          paragraph_num = read_more_attribute.split('-')[1];
          // Get count of paragraphs
          var paragraph_count = $(this).find('p').length;

          // If we should both adding 'read more' then...
          if (paragraph_count > paragraph_num) {
            // Get collapse height from paragraph number
            collapse_height = Drupal.behaviors.theGlobal.getCollapseHeight($(this), paragraph_num);
          }
          // Else let's not bother...
          else {
            return;
          }
        }
        // Finally, Else the data-js-read-more attribute is of 'height' type
        else {
          // Get height number from read_more_attribute
          collapse_height = parseInt(read_more_attribute.split('-')[1]);
        }

        // Fire the read-more plugin for $this
        $(this).readmore({
          speed: 150,
          collapsedHeight: collapse_height,
          moreLink: '<a class="js-read-more-btn js-read-more-btn--more" href="#"><span>' + Drupal.t("Read more") + '</span></a>',
          lessLink: '<a class="js-read-more-btn js-read-more-btn--less" href="#"><span>' + Drupal.t("Read less") + '</span></a>'
        });
      });
    },

    /**
     * Helper function used in Drupal.behaviors.theGlobal.readMore() to return readmore collapse height
     */
    getCollapseHeight: function getCollapseHeight($read_more_element, paragraph_num) {
      // Then determine collapse height from paragraph position in parent container
      var $last_paragraph = $read_more_element.find('p:nth-of-type(' + paragraph_num + ')');

      if ($last_paragraph.length) {
        // Find distance from bottom of paragraph to top of main parent container
        var last_paragraph_dis_top = ($last_paragraph.offset().top + $last_paragraph.outerHeight()) - $last_paragraph.parent().offset().top;
        // Round up to final pixel collapse height
        return Math.ceil(last_paragraph_dis_top);
      }
    },



    /**
     * Limit number of items to show in a list, with a "more" link.
     *
     * Please make sure that the list object, if not a list itself, resolves to
     * a single object.
     *
     * @param $list
     *   The object to be restricted - this needs to be the wrapper around a
     *   list of items, e.g. a ul or a views wrapper.
     * @param limit
     *   How many items to show.
     * @param expand
     *   How many items to add to the list - defaults to all.
     */
    limitList: function limitList($list, limit, expand) {
      expand = expand || 'all';

      var $list_children = $list.children();

      // Check on number of items in list and exit early if limit is not higher.
      if ($list_children.length <= limit) {
        return;
      }

      // If limit is higher than items, hide extra items and add more button.
      $list_children.slice(limit).css('display', 'none');
      $list.after('<button type="button" class="js-limit-list-more btn btn-default btn-small btn-block">' + Drupal.t('More') + '</button>');

      // When more link is clicked, expand by number given, or all if absent.
      $('.js-limit-list-more').once('limit-list').on('click', function () {
        var $this_list = $(this).prev();
        var $this_list_children = $this_list.children();

        if (expand === 'all') {
          $this_list.children('*:hidden').slice(0).show();
        }
        else {
          $this_list.children('*:hidden').slice(0, expand).show();
        }

        // Hide more button if no more to show.
        if ($this_list_children.length === $this_list.children('*:visible').length) {
          $(this).hide();
        }
      });
    },

    /**
     * Method will be called when anything is attached to DOM.
     */
    attach: function (context, settings) {
      // Fix broken images.
      $(".view-content a img", context).on('error', this.fixBrokenImages);

      // Add top link to scroll elements on T&C page.
      $('.tc__content h2:not(:first-of-type)').append('<a href="#top" class="js-scroll-to-element tc__top-link">' + Drupal.t('Top') + '</a>');

      // Attach scrolling to any element with class 'js-scroll-to-element'
      $('.js-scroll-to-element', context).on('click', function (event) {
        Drupal.behaviors.theGlobal.onClickScrollToElement(this, event);
      });

      // Scroll to any element that matches a hash and matches class of DOM element
      if (window.location.hash) {
        Drupal.behaviors.theGlobal.onLoadScrollToElement(window.location.hash);
      }

      // Detect read-more container and apply read-more functionality
      Drupal.behaviors.theGlobal.readMore(context);

      // Seeing as IE and Edge don't properly support object-fit, detect whether
      // or not it's supported and replace with background cover instead.
      // Detect objectFit support.
      if('objectFit' in document.documentElement.style === false) {

        // Assign HTMLCollection with parents of images with objectFit to
        // variable.
        var container = document.getElementsByClassName('js-image-object-fit');

        // Loop through HTMLCollection.
        for(var i = 0; i < container.length; i++) {

          // Assign image source to variable.
          var imageSource = container[i].querySelector('img').src;

          // Assign image height to variable.
          var imageHeight = container[i].querySelector('img').height;

          // Hide image.
          container[i].querySelector('img').style.display = 'none';

          // Set styles on container.
          container[i].style.backgroundSize = 'cover';
          container[i].style.backgroundImage = 'url(' + imageSource + ')';
          container[i].style.backgroundPosition = 'center center';
          container[i].style.height = imageHeight + 'px';
        }
      }

      // Student insights and Academic insights on rankings pages.
      Drupal.behaviors.theGlobal.limitList($('.view-rankings-linked-articles.view-display-id-panel_pane_1 .view-content ul', context), 3);
      Drupal.behaviors.theGlobal.limitList($('.view-rankings-linked-articles.view-display-id-panel_pane_2 .view-content ul', context), 3);
    }
  };
})(jQuery, Drupal, this, this.document);
;
/**
 * @file
 * Javascript for masonry list (Subjects)
 */
(function ($, Drupal, window, document, undefined) {
  Drupal.behaviors.sentenceForm = {

    // Get the form and the selects.
    formClass: '.search-form--sentence-style',
    $theSentenceForm: null,
    $singleSelects: null,

    attach: function (context, settings) {

      $(this.formClass, context).once('sentenceForm', function () {
        // Select the form.
        Drupal.behaviors.sentenceForm.$theSentenceForm = $(this);

        // Add the effects.
        Drupal.behaviors.sentenceForm.adjustChosenSelects();
        Drupal.behaviors.sentenceForm.updateSingleSelects();
        Drupal.behaviors.sentenceForm.addChosenDropdownEvent();
        Drupal.behaviors.sentenceForm.updateMultiSelects();
        Drupal.behaviors.sentenceForm.updateInputs();

        // Re calculate on resize.
        $(window).on('resize', function () {
          Drupal.behaviors.sentenceForm.resize();
        });
      });
    },

    addChosenDropdownEvent: function() {
      var $form = Drupal.behaviors.sentenceForm.$theSentenceForm,
          $singleSelects = $('select.sentence-select-list', $form);

      $singleSelects.on('chosen:showing_dropdown', function(evt, params) {
        var singleLineHeight = $(this).height(), // Get 'chosen' field height
            $chosen = $(this).next(),
            chosenHeight = $('.chosen-single', $chosen).height(),
            $chosenDrop = $('.chosen-drop', $chosen),
            chosenBreakWidth = $(this).attr('data-break-width');

        // Reset from previous times.
        Drupal.behaviors.sentenceForm.reset();

        // Round to the nearest singleLineheight and find the number of lines.
        var roundedHeight = Math.round(chosenHeight/singleLineHeight) * singleLineHeight,
            numberOfLines = roundedHeight / singleLineHeight;

        // Find the left position of the chosen container.
        // It's hard to find the left position directly because all of the elements are inline.
        // So briefly display the actual select and use its position instead.
        // Use the data-break-width attr as the width of the select.
        // The data-break-width width is the width of the first width in the select list.
        $chosen.prev().css({display: 'inline-block', width: chosenBreakWidth + 'px'});
        var leftPosition = $chosen.prev().position().left;
        $chosen.prev().hide();

        // Find the right position of the chosen-drop.
        // Make sure that the chosen-drop never appears off screen.
        // If the right position of the chosen-drop exceeds the width of the form, shift it back in again.
        var chosenRight = leftPosition + $chosenDrop.width(),
            formWidth = $form.width();

        if (chosenRight > formWidth) {
          var overReach =  formWidth - chosenRight - 4;
          $('.chosen-drop', $chosen).css({marginLeft: + overReach + 'px'});
        }

        // If the number of lines is greater than 1 then its a multi-line select
        // and should be shifted back to the left edge.
        if (numberOfLines > 1) {
          $('.chosen-drop', $chosen).css({marginLeft: '-' + leftPosition + 'px'});
        }
      });

      // This change event does two things.
      // 1: It adds a class to show whether or not an option has been selected.
      // 2: It calculates the width of the first word of the current selected value.
      // This is applied as a data attribute and is used to fix an edge case bug in the positioning of the chosen drop.
      $singleSelects.on('change', function(evt, params) {
        // When a single choice select box is changed
        Drupal.behaviors.sentenceForm.updateSingleSelects();
      });
    },

    adjustChosenSelects: function() {
      var $form = Drupal.behaviors.sentenceForm.$theSentenceForm;

      // Need to to able to detect when the selects are flowing to two or more lines.
      // To do that wrap the first word in a span and use its heights for reference.
      var $label = $('label', $form).eq(0),
          $text = $label.text(),
          textArray = $text.split(' ');

      textArray[0] = '<span id="first-word">' + textArray[0] + '</span>';
      $label.html(textArray.join(' '));
    },

    // Events for single select boxes.
    updateSingleSelects: function() {
      var $form = Drupal.behaviors.sentenceForm.$theSentenceForm,
          // $singleSelects = $('.sentence-select-list option:selected', $form)
          $singleSelects = $('select.sentence-select-list', $form);

      // Get first word width to attach as 'data-break-width' attr which is used to fix
      // visual bug fixes on different size devices.
      $singleSelects.each(function(key, value) {
        var $selected = $('option:selected', this),
            firstWord = $selected.text().split(' ')[0];

        // Add a test span to find the width of the first word.
        // @TOOD: Ryan have a look.
        var $span = '<span class="ssf-tester ssf-text-width-tester-' + key + '">' + firstWord + '</span>';
        $(this).before($span);
        var firstWordWidth = $('.ssf-text-width-tester-' + key).width();
        $('.ssf-tester').remove();

        // Add attribute to select to be used to fix visual bugs on different size devices.
        $(this).attr('data-break-width', firstWordWidth);
      });

      // Add remove class for selected value.
      Drupal.behaviors.sentenceForm.selectedValueClass($singleSelects);
    },

    // Events for multi select boxes
    updateMultiSelects: function() {
      // Get corresponding chosen multi select box
      var $form = Drupal.behaviors.sentenceForm.$theSentenceForm,
          $multiSelectInput = $('select[multiple="multiple"]', $form),
          $chosenSelect,
          numOptionsSelected;

      // When a multi choice select box is changed
      if ($multiSelectInput.length > 0) {
        $form.off('change').on('change', $multiSelectInput, function () {
          $chosenSelect = Drupal.behaviors.sentenceForm.getChosenClass($multiSelectInput);
          numOptionsSelected = $('option:selected', $multiSelectInput).length;

          // Add class to allow for styling when selected
          if (numOptionsSelected > 0) {
            $chosenSelect.addClass('selected');
          } else {
            $chosenSelect.removeClass('selected');
          }
        });
      }
    },

    // Events for Inputs
    updateInputs: function() {
      var $input = $('input[type="text"].form-control', Drupal.behaviors.sentenceForm.$theSentenceForm);

      if (!$input.length) {
        return;
      }

      // On load
      // If input has stuff in it
      if ($input.val().length > 1) {
        // then keep it expanded
        $input.addClass('focused');
        // Also update the width of the field to accommodate preloaded value
        Drupal.behaviors.sentenceForm.setFieldWidth($input);
      }

      // On focus
      $input.on('focus', function() {
        // Add class to expand
        $(this).addClass('focused');
      });

      // On change
      $input.on('input', function() {
        // Expand the text field to width of value
        Drupal.behaviors.sentenceForm.setFieldWidth($input);
      });

      // On blur
      $input.on('blur', function() {
        // If field is empty
        if ($(this).val() == '') {
          // then return to the placeholder
          $(this).removeClass('focused');
        }
      });
    },

    // Set width on input field by length of text inside it.
    setFieldWidth: function($element) {
      // Create empty span to place element text inside for width measurement.
      var $span = '<span style="display: none;"></span>';
      $element.after($span);

      var text = $element.val().replace(/\s+/g, ' ');
      var placeholder = $element.attr('placeholder');
      var span = $element.next('span');
      span.text(placeholder);
      var field_width = span.width();

      if (text !== '') {
        span.text(text);
        field_width = span.width();
      }
      span.remove();

      // Set width on input field, with arbitrary value added to address it
      // being slightly too narrow. Apologies for the magic number.
      $element.css('width', field_width + 12);
    },

    // Utility function to return a select boxes corresponding chosen select
    getChosenClass: function($originalSelectBox) {
      return $('#' + $originalSelectBox.attr('id').replace(/-/g, "_") + '_chosen');
    },

    reset: function() {
      $(Drupal.behaviors.sentenceForm.formClass + ' .chosen-drop').removeAttr('style');
    },

    resize: function() {
      Drupal.behaviors.sentenceForm.adjustChosenSelects();
    },

    selectedValueClass: function($selects) {
      $selects.each(function() {
        if ($(this).val() == '') {
          $(this).addClass('no-selection');
          $(this).next().addClass('no-selection');
        }
        else {
          $(this).removeClass('no-selection');
          $(this).next().removeClass('no-selection');
        }
      });
    }
  }
})(jQuery, Drupal, this, this.document);
;
/**
 * @file
 * Improvements to the search refine pane.
 */

(function ($) {
  'use strict';
  Drupal.behaviors.theSearchRefine = {
    formAutoSubmitChange: function formAutoSubmitChange(e) {
      $(this).submit();
    },
    syncKeySearchFields: function syncKeySearchFields(e) {
      $('.search-keys-field').not(this).val(this.value);
    },
    attach: function (context, settings) {
      // Make form auto-submitting.
      $('form.search-refine', context)
        .addClass('js-form--auto-submit')
        .on('change', this.formAutoSubmitChange);

      // Use "chosen" to improve select elements.
      if ($.fn.chosen) {
        $('.search-refine__select', context).chosen();
      }

      // Sync multiple keys search fields.
      $('.search-keys-field', context).on('keyup', this.syncKeySearchFields);
    }
  }
})(jQuery);
;
/**
 * @file
 * Track the search results.
 *
 * @see https://github.com/tes/mz/wiki/How-to-implement-and-extend-MZ-framework
 * @see https://github.com/tes/cms-modules/blob/master/mz_analytics/js/mz_analytics.js
 */

(function ($) {
  'use strict';
  $(document).on("mz.pageViewProperties:loaded", function () {
    if (Drupal.settings.theSearchTracking) {
      window.TES = window.TES || {};
      if (window.TES.pageMetadata.impressions) {
        Drupal.settings.theSearchTracking.impressions = window.TES.pageMetadata.impressions;
      }
      window.TES.pageMetadata = Drupal.settings.theSearchTracking;
      // @TODO: When we ajaxify this we'll need to re-trigger the event?
    }
  })
})(jQuery);
;
(function ($) {

/**
 * A progressbar object. Initialized with the given id. Must be inserted into
 * the DOM afterwards through progressBar.element.
 *
 * method is the function which will perform the HTTP request to get the
 * progress bar state. Either "GET" or "POST".
 *
 * e.g. pb = new progressBar('myProgressBar');
 *      some_element.appendChild(pb.element);
 */
Drupal.progressBar = function (id, updateCallback, method, errorCallback) {
  var pb = this;
  this.id = id;
  this.method = method || 'GET';
  this.updateCallback = updateCallback;
  this.errorCallback = errorCallback;

  // The WAI-ARIA setting aria-live="polite" will announce changes after users
  // have completed their current activity and not interrupt the screen reader.
  this.element = $('<div class="progress-wrapper" aria-live="polite"></div>');
  this.element.html('<div id ="' + id + '" class="progress progress-striped active">' +
                    '<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
                    '<div class="percentage sr-only"></div>' +
                    '</div></div>' +
                    '</div><div class="percentage pull-right"></div>' +
                    '<div class="message">&nbsp;</div>');
};

/**
 * Set the percentage and status message for the progressbar.
 */
Drupal.progressBar.prototype.setProgress = function (percentage, message) {
  if (percentage >= 0 && percentage <= 100) {
    $('div.progress-bar', this.element).css('width', percentage + '%');
    $('div.progress-bar', this.element).attr('aria-valuenow', percentage);
    $('div.percentage', this.element).html(percentage + '%');
  }
  $('div.message', this.element).html(message);
  if (this.updateCallback) {
    this.updateCallback(percentage, message, this);
  }
};

/**
 * Start monitoring progress via Ajax.
 */
Drupal.progressBar.prototype.startMonitoring = function (uri, delay) {
  this.delay = delay;
  this.uri = uri;
  this.sendPing();
};

/**
 * Stop monitoring progress via Ajax.
 */
Drupal.progressBar.prototype.stopMonitoring = function () {
  clearTimeout(this.timer);
  // This allows monitoring to be stopped from within the callback.
  this.uri = null;
};

/**
 * Request progress data from server.
 */
Drupal.progressBar.prototype.sendPing = function () {
  if (this.timer) {
    clearTimeout(this.timer);
  }
  if (this.uri) {
    var pb = this;
    // When doing a post request, you need non-null data. Otherwise a
    // HTTP 411 or HTTP 406 (with Apache mod_security) error may result.
    $.ajax({
      type: this.method,
      url: this.uri,
      data: '',
      dataType: 'json',
      success: function (progress) {
        // Display errors.
        if (progress.status == 0) {
          pb.displayError(progress.data);
          return;
        }
        // Update display.
        pb.setProgress(progress.percentage, progress.message);
        // Schedule next timer.
        pb.timer = setTimeout(function () { pb.sendPing(); }, pb.delay);
      },
      error: function (xmlhttp) {
        pb.displayError(Drupal.ajaxError(xmlhttp, pb.uri));
      }
    });
  }
};

/**
 * Display errors on the page.
 */
Drupal.progressBar.prototype.displayError = function (string) {
  var error = $('<div class="alert alert-block alert-error"><a class="close" data-dismiss="alert" href="#">&times;</a><h4>Error message</h4></div>').append(string);
  $(this.element).before(error).hide();

  if (this.errorCallback) {
    this.errorCallback(this);
  }
};

})(jQuery);
;
/**
 * @file
 *
 * Implement a modal form.
 *
 * @see modal.inc for documentation.
 *
 * This javascript relies on the CTools ajax responder.
 */

(function ($) {
  // Make sure our objects are defined.
  Drupal.CTools = Drupal.CTools || {};
  Drupal.CTools.Modal = Drupal.CTools.Modal || {};

  /**
   * Display the modal
   *
   * @todo -- document the settings.
   */
  Drupal.CTools.Modal.show = function(choice) {
    var opts = {};

    if (choice && typeof choice == 'string' && Drupal.settings[choice]) {
      // This notation guarantees we are actually copying it.
      $.extend(true, opts, Drupal.settings[choice]);
    }
    else if (choice) {
      $.extend(true, opts, choice);
    }

    var defaults = {
      modalTheme: 'CToolsModalDialog',
      throbberTheme: 'CToolsModalThrobber',
      animation: 'show',
      animationSpeed: 'fast',
      modalSize: {
        type: 'scale',
        width: .8,
        height: .8,
        addWidth: 0,
        addHeight: 0,
        // How much to remove from the inner content to make space for the
        // theming.
        contentRight: 25,
        contentBottom: 45
      },
      modalOptions: {
        opacity: .55,
        background: '#fff'
      },
      modalClass: 'default'
    };

    var settings = {};
    $.extend(true, settings, defaults, Drupal.settings.CToolsModal, opts);

    if (Drupal.CTools.Modal.currentSettings && Drupal.CTools.Modal.currentSettings != settings) {
      Drupal.CTools.Modal.modal.remove();
      Drupal.CTools.Modal.modal = null;
    }

    Drupal.CTools.Modal.currentSettings = settings;

    var resize = function(e) {
      // When creating the modal, it actually exists only in a theoretical
      // place that is not in the DOM. But once the modal exists, it is in the
      // DOM so the context must be set appropriately.
      var context = e ? document : Drupal.CTools.Modal.modal;

      if (Drupal.CTools.Modal.currentSettings.modalSize.type == 'scale') {
        var width = $(window).width() * Drupal.CTools.Modal.currentSettings.modalSize.width;
        var height = $(window).height() * Drupal.CTools.Modal.currentSettings.modalSize.height;
      }
      else {
        var width = Drupal.CTools.Modal.currentSettings.modalSize.width;
        var height = Drupal.CTools.Modal.currentSettings.modalSize.height;
      }

      // Use the additionol pixels for creating the width and height.
      $('div.ctools-modal-content', context).css({
        'width': width + Drupal.CTools.Modal.currentSettings.modalSize.addWidth + 'px',
        'height': height + Drupal.CTools.Modal.currentSettings.modalSize.addHeight + 'px'
      });
      $('div.ctools-modal-content .modal-content', context).css({
        'width': (width - Drupal.CTools.Modal.currentSettings.modalSize.contentRight) + 'px',
        'height': (height - Drupal.CTools.Modal.currentSettings.modalSize.contentBottom) + 'px'
      });
    }

    if (!Drupal.CTools.Modal.modal) {
      Drupal.CTools.Modal.modal = $(Drupal.theme(settings.modalTheme));
      if (settings.modalSize.type == 'scale') {
        $(window).bind('resize', resize);
      }
    }

    resize();

    $('span.modal-title', Drupal.CTools.Modal.modal).html(Drupal.CTools.Modal.currentSettings.loadingText);
    Drupal.CTools.Modal.modalContent(Drupal.CTools.Modal.modal, settings.modalOptions, settings.animation, settings.animationSpeed, settings.modalClass);
    $('#modalContent .modal-content').html(Drupal.theme(settings.throbberTheme)).addClass('ctools-modal-loading');

    // Position autocomplete results based on the scroll position of the modal.
    $('#modalContent .modal-content').delegate('input.form-autocomplete', 'keyup', function() {
      $('#autocomplete').css('top', $(this).position().top + $(this).outerHeight() + $(this).offsetParent().filter('#modal-content').scrollTop());
    });
  };

  /**
   * Hide the modal
   */
  Drupal.CTools.Modal.dismiss = function() {
    if (Drupal.CTools.Modal.modal) {
      Drupal.CTools.Modal.unmodalContent(Drupal.CTools.Modal.modal);
    }
  };

  /**
   * Provide the HTML to create the modal dialog.
   */
  Drupal.theme.prototype.CToolsModalDialog = function () {
    var html = ''
    html += '<div id="ctools-modal">'
    html += '  <div class="ctools-modal-content">' // panels-modal-content
    html += '    <div class="modal-header">';
    html += '      <a class="close" href="#">';
    html +=          Drupal.CTools.Modal.currentSettings.closeText + Drupal.CTools.Modal.currentSettings.closeImage;
    html += '      </a>';
    html += '      <span id="modal-title" class="modal-title">&nbsp;</span>';
    html += '    </div>';
    html += '    <div id="modal-content" class="modal-content">';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    return html;
  }

  /**
   * Provide the HTML to create the throbber.
   */
  Drupal.theme.prototype.CToolsModalThrobber = function () {
    var html = '';
    html += '<div id="modal-throbber">';
    html += '  <div class="modal-throbber-wrapper">';
    html +=      Drupal.CTools.Modal.currentSettings.throbber;
    html += '  </div>';
    html += '</div>';

    return html;
  };

  /**
   * Figure out what settings string to use to display a modal.
   */
  Drupal.CTools.Modal.getSettings = function (object) {
    var match = $(object).attr('class').match(/ctools-modal-(\S+)/);
    if (match) {
      return match[1];
    }
  }

  /**
   * Click function for modals that can be cached.
   */
  Drupal.CTools.Modal.clickAjaxCacheLink = function () {
    Drupal.CTools.Modal.show(Drupal.CTools.Modal.getSettings(this));
    return Drupal.CTools.AJAX.clickAJAXCacheLink.apply(this);
  };

  /**
   * Handler to prepare the modal for the response
   */
  Drupal.CTools.Modal.clickAjaxLink = function () {
    Drupal.CTools.Modal.show(Drupal.CTools.Modal.getSettings(this));
    return false;
  };

  /**
   * Submit responder to do an AJAX submit on all modal forms.
   */
  Drupal.CTools.Modal.submitAjaxForm = function(e) {
    var $form = $(this);
    var url = $form.attr('action');

    setTimeout(function() { Drupal.CTools.AJAX.ajaxSubmit($form, url); }, 1);
    return false;
  }

  /**
   * Bind links that will open modals to the appropriate function.
   */
  Drupal.behaviors.ZZCToolsModal = {
    attach: function(context) {
      // Bind links
      // Note that doing so in this order means that the two classes can be
      // used together safely.
      /*
       * @todo remimplement the warm caching feature
       $('a.ctools-use-modal-cache', context).once('ctools-use-modal', function() {
         $(this).click(Drupal.CTools.Modal.clickAjaxCacheLink);
         Drupal.CTools.AJAX.warmCache.apply(this);
       });
        */

      $('area.ctools-use-modal, a.ctools-use-modal', context).once('ctools-use-modal', function() {
        var $this = $(this);
        $this.click(Drupal.CTools.Modal.clickAjaxLink);
        // Create a drupal ajax object
        var element_settings = {};
        if ($this.attr('href')) {
          element_settings.url = $this.attr('href');
          element_settings.event = 'click';
          element_settings.progress = { type: 'throbber' };
        }
        var base = $this.attr('href');
        Drupal.ajax[base] = new Drupal.ajax(base, this, element_settings);
      });

      // Bind buttons
      $('input.ctools-use-modal, button.ctools-use-modal', context).once('ctools-use-modal', function() {
        var $this = $(this);
        $this.click(Drupal.CTools.Modal.clickAjaxLink);
        var button = this;
        var element_settings = {};

        // AJAX submits specified in this manner automatically submit to the
        // normal form action.
        element_settings.url = Drupal.CTools.Modal.findURL(this);
        if (element_settings.url == '') {
          element_settings.url = $(this).closest('form').attr('action');
        }
        element_settings.event = 'click';
        element_settings.setClick = true;

        var base = $this.attr('id');
        Drupal.ajax[base] = new Drupal.ajax(base, this, element_settings);

        // Make sure changes to settings are reflected in the URL.
        $('.' + $(button).attr('id') + '-url').change(function() {
          Drupal.ajax[base].options.url = Drupal.CTools.Modal.findURL(button);
        });
      });

      // Bind our custom event to the form submit
      $('#modal-content form', context).once('ctools-use-modal', function() {
        var $this = $(this);
        var element_settings = {};

        element_settings.url = $this.attr('action');
        element_settings.event = 'submit';
        element_settings.progress = { 'type': 'throbber' }
        var base = $this.attr('id');

        Drupal.ajax[base] = new Drupal.ajax(base, this, element_settings);
        Drupal.ajax[base].form = $this;

        $('input[type=submit], button', this).click(function(event) {
          Drupal.ajax[base].element = this;
          this.form.clk = this;
          // Stop autocomplete from submitting.
          if (Drupal.autocompleteSubmit && !Drupal.autocompleteSubmit()) {
            return false;
          }
          // An empty event means we were triggered via .click() and
          // in jquery 1.4 this won't trigger a submit.
          // We also have to check jQuery version to prevent
          // IE8 + jQuery 1.4.4 to break on other events
          // bound to the submit button.
          if (jQuery.fn.jquery.substr(0, 3) === '1.4' && typeof event.bubbles === "undefined") {
            $(this.form).trigger('submit');
            return false;
          }
        });
      });

      // Bind a click handler to allow elements with the 'ctools-close-modal'
      // class to close the modal.
      $('.ctools-close-modal', context).once('ctools-close-modal')
        .click(function() {
          Drupal.CTools.Modal.dismiss();
          return false;
        });
    }
  };

  // The following are implementations of AJAX responder commands.

  /**
   * AJAX responder command to place HTML within the modal.
   */
  Drupal.CTools.Modal.modal_display = function(ajax, response, status) {
    if ($('#modalContent').length == 0) {
      Drupal.CTools.Modal.show(Drupal.CTools.Modal.getSettings(ajax.element));
    }
    $('#modal-title').html(response.title);
    // Simulate an actual page load by scrolling to the top after adding the
    // content. This is helpful for allowing users to see error messages at the
    // top of a form, etc.
    $('#modal-content').html(response.output).scrollTop(0);

    // Attach behaviors within a modal dialog.
    var settings = response.settings || ajax.settings || Drupal.settings;
    Drupal.attachBehaviors($('#modalContent'), settings);

    if ($('#modal-content').hasClass('ctools-modal-loading')) {
      $('#modal-content').removeClass('ctools-modal-loading');
    }
    else {
      // If the modal was already shown, and we are simply replacing its
      // content, then focus on the first focusable element in the modal.
      // (When first showing the modal, focus will be placed on the close
      // button by the show() function called above.)
      $('#modal-content :focusable:first').focus();
    }
  }

  /**
   * AJAX responder command to dismiss the modal.
   */
  Drupal.CTools.Modal.modal_dismiss = function(command) {
    Drupal.CTools.Modal.dismiss();
    $('link.ctools-temporary-css').remove();
  }

  /**
   * Display loading
   */
  //Drupal.CTools.AJAX.commands.modal_loading = function(command) {
  Drupal.CTools.Modal.modal_loading = function(command) {
    Drupal.CTools.Modal.modal_display({
      output: Drupal.theme(Drupal.CTools.Modal.currentSettings.throbberTheme),
      title: Drupal.CTools.Modal.currentSettings.loadingText
    });
  }

  /**
   * Find a URL for an AJAX button.
   *
   * The URL for this gadget will be composed of the values of items by
   * taking the ID of this item and adding -url and looking for that
   * class. They need to be in the form in order since we will
   * concat them all together using '/'.
   */
  Drupal.CTools.Modal.findURL = function(item) {
    var url = '';
    var url_class = '.' + $(item).attr('id') + '-url';
    $(url_class).each(
      function() {
        var $this = $(this);
        if (url && $this.val()) {
          url += '/';
        }
        url += $this.val();
      });
    return url;
  };


  /**
   * modalContent
   * @param content string to display in the content box
   * @param css obj of css attributes
   * @param animation (fadeIn, slideDown, show)
   * @param speed (valid animation speeds slow, medium, fast or # in ms)
   * @param modalClass class added to div#modalContent
   */
  Drupal.CTools.Modal.modalContent = function(content, css, animation, speed, modalClass) {
    // If our animation isn't set, make it just show/pop
    if (!animation) {
      animation = 'show';
    }
    else {
      // If our animation isn't "fadeIn" or "slideDown" then it always is show
      if (animation != 'fadeIn' && animation != 'slideDown') {
        animation = 'show';
      }
    }

    if (!speed && 0 !== speed) {
      speed = 'fast';
    }

    // Build our base attributes and allow them to be overriden
    css = jQuery.extend({
      position: 'absolute',
      left: '0px',
      margin: '0px',
      background: '#000',
      opacity: '.55'
    }, css);

    // Add opacity handling for IE.
    css.filter = 'alpha(opacity=' + (100 * css.opacity) + ')';
    content.hide();

    // If we already have modalContent, remove it.
    if ($('#modalBackdrop').length) $('#modalBackdrop').remove();
    if ($('#modalContent').length) $('#modalContent').remove();

    // position code lifted from http://www.quirksmode.org/viewport/compatibility.html
    if (self.pageYOffset) { // all except Explorer
    var wt = self.pageYOffset;
    } else if (document.documentElement && document.documentElement.scrollTop) { // Explorer 6 Strict
      var wt = document.documentElement.scrollTop;
    } else if (document.body) { // all other Explorers
      var wt = document.body.scrollTop;
    }

    // Get our dimensions

    // Get the docHeight and (ugly hack) add 50 pixels to make sure we dont have a *visible* border below our div
    var docHeight = $(document).height() + 50;
    var docWidth = $(document).width();
    var winHeight = $(window).height();
    var winWidth = $(window).width();
    if( docHeight < winHeight ) docHeight = winHeight;

    // Create our divs
    $('body').append('<div id="modalBackdrop" class="backdrop-' + modalClass + '" style="z-index: 1000; display: none;"></div><div id="modalContent" class="modal-' + modalClass + '" style="z-index: 1001; position: absolute;">' + $(content).html() + '</div>');

    // Get a list of the tabbable elements in the modal content.
    var getTabbableElements = function () {
      var tabbableElements = $('#modalContent :tabbable'),
          radioButtons = tabbableElements.filter('input[type="radio"]');

      // The list of tabbable elements from jQuery is *almost* right. The
      // exception is with groups of radio buttons. The list from jQuery will
      // include all radio buttons, when in fact, only the selected radio button
      // is tabbable, and if no radio buttons in a group are selected, then only
      // the first is tabbable.
      if (radioButtons.length > 0) {
        // First, build up an index of which groups have an item selected or not.
        var anySelected = {};
        radioButtons.each(function () {
          var name = this.name;

          if (typeof anySelected[name] === 'undefined') {
            anySelected[name] = radioButtons.filter('input[name="' + name + '"]:checked').length !== 0;
          }
        });

        // Next filter out the radio buttons that aren't really tabbable.
        var found = {};
        tabbableElements = tabbableElements.filter(function () {
          var keep = true;

          if (this.type == 'radio') {
            if (anySelected[this.name]) {
              // Only keep the selected one.
              keep = this.checked;
            }
            else {
              // Only keep the first one.
              if (found[this.name]) {
                keep = false;
              }
              found[this.name] = true;
            }
          }

          return keep;
        });
      }

      return tabbableElements.get();
    };

    // Keyboard and focus event handler ensures only modal elements gain focus.
    modalEventHandler = function( event ) {
      target = null;
      if ( event ) { //Mozilla
        target = event.target;
      } else { //IE
        event = window.event;
        target = event.srcElement;
      }

      var parents = $(target).parents().get();
      for (var i = 0; i < parents.length; ++i) {
        var position = $(parents[i]).css('position');
        if (position == 'absolute' || position == 'fixed') {
          return true;
        }
      }

      if ($(target).is('#modalContent, body') || $(target).filter('*:visible').parents('#modalContent').length) {
        // Allow the event only if target is a visible child node
        // of #modalContent.
        return true;
      }
      else {
        getTabbableElements()[0].focus();
      }

      event.preventDefault();
    };
    $('body').bind( 'focus', modalEventHandler );
    $('body').bind( 'keypress', modalEventHandler );

    // Keypress handler Ensures you can only TAB to elements within the modal.
    // Based on the psuedo-code from WAI-ARIA 1.0 Authoring Practices section
    // 3.3.1 "Trapping Focus".
    modalTabTrapHandler = function (evt) {
      // We only care about the TAB key.
      if (evt.which != 9) {
        return true;
      }

      var tabbableElements = getTabbableElements(),
          firstTabbableElement = tabbableElements[0],
          lastTabbableElement = tabbableElements[tabbableElements.length - 1],
          singleTabbableElement = firstTabbableElement == lastTabbableElement,
          node = evt.target;

      // If this is the first element and the user wants to go backwards, then
      // jump to the last element.
      if (node == firstTabbableElement && evt.shiftKey) {
        if (!singleTabbableElement) {
          lastTabbableElement.focus();
        }
        return false;
      }
      // If this is the last element and the user wants to go forwards, then
      // jump to the first element.
      else if (node == lastTabbableElement && !evt.shiftKey) {
        if (!singleTabbableElement) {
          firstTabbableElement.focus();
        }
        return false;
      }
      // If this element isn't in the dialog at all, then jump to the first
      // or last element to get the user into the game.
      else if ($.inArray(node, tabbableElements) == -1) {
        // Make sure the node isn't in another modal (ie. WYSIWYG modal).
        var parents = $(node).parents().get();
        for (var i = 0; i < parents.length; ++i) {
          var position = $(parents[i]).css('position');
          if (position == 'absolute' || position == 'fixed') {
            return true;
          }
        }

        if (evt.shiftKey) {
          lastTabbableElement.focus();
        }
        else {
          firstTabbableElement.focus();
        }
      }
    };
    $('body').bind('keydown', modalTabTrapHandler);

    // Create our content div, get the dimensions, and hide it
    var modalContent = $('#modalContent').css('top','-1000px');
    var $modalHeader = modalContent.find('.modal-header');
    var mdcTop = wt + Math.max((winHeight / 2) - (modalContent.outerHeight() / 2), 0);
    var mdcLeft = ( winWidth / 2 ) - ( modalContent.outerWidth() / 2);
    $('#modalBackdrop').css(css).css('top', 0).css('height', docHeight + 'px').css('width', docWidth + 'px').show();
    modalContent.css({top: mdcTop + 'px', left: mdcLeft + 'px'}).hide()[animation](speed);

    // Bind a click for closing the modalContent
    modalContentClose = function(){close(); return false;};
    $('.close', $modalHeader).bind('click', modalContentClose);

    // Bind a keypress on escape for closing the modalContent
    modalEventEscapeCloseHandler = function(event) {
      if (event.keyCode == 27) {
        close();
        return false;
      }
    };

    $(document).bind('keydown', modalEventEscapeCloseHandler);

    // Per WAI-ARIA 1.0 Authoring Practices, initial focus should be on the
    // close button, but we should save the original focus to restore it after
    // the dialog is closed.
    var oldFocus = document.activeElement;
    $('.close', $modalHeader).focus();

    // Close the open modal content and backdrop
    function close() {
      // Unbind the events
      $(window).unbind('resize',  modalContentResize);
      $('body').unbind( 'focus', modalEventHandler);
      $('body').unbind( 'keypress', modalEventHandler );
      $('body').unbind( 'keydown', modalTabTrapHandler );
      $('.close', $modalHeader).unbind('click', modalContentClose);
      $(document).unbind('keydown', modalEventEscapeCloseHandler);
      $(document).trigger('CToolsDetachBehaviors', $('#modalContent'));

      // Closing animation.
      switch (animation) {
        case 'fadeIn':
          modalContent.fadeOut(speed, modalContentRemove);
          break;

        case 'slideDown':
          modalContent.slideUp(speed, modalContentRemove);
          break;

        case 'show':
          modalContent.hide(speed, modalContentRemove);
          break;
      }
    }

    // Remove the content.
    modalContentRemove = function () {
      $('#modalContent').remove();
      $('#modalBackdrop').remove();

      // Restore focus to where it was before opening the dialog.
      $(oldFocus).focus();
    };

    // Move and resize the modalBackdrop and modalContent on window resize.
    modalContentResize = function () {
      // Reset the backdrop height/width to get accurate document size.
      $('#modalBackdrop').css('height', '').css('width', '');

      // Position code lifted from:
      // http://www.quirksmode.org/viewport/compatibility.html
      if (self.pageYOffset) { // all except Explorer
        var wt = self.pageYOffset;
      } else if (document.documentElement && document.documentElement.scrollTop) { // Explorer 6 Strict
        var wt = document.documentElement.scrollTop;
      } else if (document.body) { // all other Explorers
        var wt = document.body.scrollTop;
      }

      // Get our heights
      var docHeight = $(document).height();
      var docWidth = $(document).width();
      var winHeight = $(window).height();
      var winWidth = $(window).width();
      if( docHeight < winHeight ) docHeight = winHeight;

      // Get where we should move content to
      var modalContent = $('#modalContent');
      var mdcTop = wt + Math.max((winHeight / 2) - (modalContent.outerHeight() / 2), 0);
      var mdcLeft = ( winWidth / 2 ) - ( modalContent.outerWidth() / 2);

      // Apply the changes
      $('#modalBackdrop').css('height', docHeight + 'px').css('width', docWidth + 'px').show();
      modalContent.css('top', mdcTop + 'px').css('left', mdcLeft + 'px').show();
    };
    $(window).bind('resize', modalContentResize);
  };

  /**
   * unmodalContent
   * @param content (The jQuery object to remove)
   * @param animation (fadeOut, slideUp, show)
   * @param speed (valid animation speeds slow, medium, fast or # in ms)
   */
  Drupal.CTools.Modal.unmodalContent = function(content, animation, speed)
  {
    // If our animation isn't set, make it just show/pop
    if (!animation) { var animation = 'show'; } else {
      // If our animation isn't "fade" then it always is show
      if (( animation != 'fadeOut' ) && ( animation != 'slideUp')) animation = 'show';
    }
    // Set a speed if we dont have one
    if ( !speed ) var speed = 'fast';

    // Unbind the events we bound
    $(window).unbind('resize', modalContentResize);
    $('body').unbind('focus', modalEventHandler);
    $('body').unbind('keypress', modalEventHandler);
    $('body').unbind( 'keydown', modalTabTrapHandler );
    var $modalContent = $('#modalContent');
    var $modalHeader = $modalContent.find('.modal-header');
    $('.close', $modalHeader).unbind('click', modalContentClose);
    $('body').unbind('keypress', modalEventEscapeCloseHandler);
    $(document).trigger('CToolsDetachBehaviors', $modalContent);

    // jQuery magic loop through the instances and run the animations or removal.
    content.each(function(){
      if ( animation == 'fade' ) {
        $('#modalContent').fadeOut(speed, function() {
          $('#modalBackdrop').fadeOut(speed, function() {
            $(this).remove();
          });
          $(this).remove();
        });
      } else {
        if ( animation == 'slide' ) {
          $('#modalContent').slideUp(speed,function() {
            $('#modalBackdrop').slideUp(speed, function() {
              $(this).remove();
            });
            $(this).remove();
          });
        } else {
          $('#modalContent').remove();
          $('#modalBackdrop').remove();
        }
      }
    });
  };

$(function() {
  Drupal.ajax.prototype.commands.modal_display = Drupal.CTools.Modal.modal_display;
  Drupal.ajax.prototype.commands.modal_dismiss = Drupal.CTools.Modal.modal_dismiss;
});

})(jQuery);
;
/**
 * Provide the HTML to create the modal dialog.
 */
Drupal.theme.prototype.THELoginModal = function () {
  var html = '';

  html += '<div id="ctools-modal">';
  html += '  <div class="the-modal the-modal--large ctools-modal-dialog modal-dialog">';
  html += '    <div class="modal-content">';
  // html += '      <div class="the-modal__close the-modal__close--no-header">' + Drupal.CTools.Modal.currentSettings.closeText + '</div>';
  html += '      <div class="the-modal__scroll"><div id="modal-content" class="the-modal__content the-modal__content--no-header modal-body"></div></div>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  return html;

};
;
/**
 * @file
 *
 * CTools flexible AJAX responder object.
 */

(function ($) {
  Drupal.CTools = Drupal.CTools || {};
  Drupal.CTools.AJAX = Drupal.CTools.AJAX || {};
  /**
   * Grab the response from the server and store it.
   *
   * @todo restore the warm cache functionality
   */
  Drupal.CTools.AJAX.warmCache = function () {
    // Store this expression for a minor speed improvement.
    $this = $(this);
    var old_url = $this.attr('href');
    // If we are currently fetching, or if we have fetched this already which is
    // ideal for things like pagers, where the previous page might already have
    // been seen in the cache.
    if ($this.hasClass('ctools-fetching') || Drupal.CTools.AJAX.commandCache[old_url]) {
      return false;
    }

    // Grab all the links that match this url and add the fetching class.
    // This allows the caching system to grab each url once and only once
    // instead of grabbing the url once per <a>.
    var $objects = $('a[href="' + old_url + '"]')
    $objects.addClass('ctools-fetching');
    try {
      url = old_url.replace(/\/nojs(\/|$)/g, '/ajax$1');
      $.ajax({
        type: "POST",
        url: url,
        data: { 'js': 1, 'ctools_ajax': 1},
        global: true,
        success: function (data) {
          Drupal.CTools.AJAX.commandCache[old_url] = data;
          $objects.addClass('ctools-cache-warmed').trigger('ctools-cache-warm', [data]);
        },
        complete: function() {
          $objects.removeClass('ctools-fetching');
        },
        dataType: 'json'
      });
    }
    catch (err) {
      $objects.removeClass('ctools-fetching');
      return false;
    }

    return false;
  };

  /**
   * Cachable click handler to fetch the commands out of the cache or from url.
   */
  Drupal.CTools.AJAX.clickAJAXCacheLink = function () {
    $this = $(this);
    if ($this.hasClass('ctools-fetching')) {
      $this.bind('ctools-cache-warm', function (event, data) {
        Drupal.CTools.AJAX.respond(data);
      });
      return false;
    }
    else {
      if ($this.hasClass('ctools-cache-warmed') && Drupal.CTools.AJAX.commandCache[$this.attr('href')]) {
        Drupal.CTools.AJAX.respond(Drupal.CTools.AJAX.commandCache[$this.attr('href')]);
        return false;
      }
      else {
        return Drupal.CTools.AJAX.clickAJAXLink.apply(this);
      }
    }
  };

  /**
   * Find a URL for an AJAX button.
   *
   * The URL for this gadget will be composed of the values of items by
   * taking the ID of this item and adding -url and looking for that
   * class. They need to be in the form in order since we will
   * concat them all together using '/'.
   */
  Drupal.CTools.AJAX.findURL = function(item) {
    var url = '';
    var url_class = '.' + $(item).attr('id') + '-url';
    $(url_class).each(
      function() {
        var $this = $(this);
        if (url && $this.val()) {
          url += '/';
        }
        url += $this.val();
      });
    return url;
  };

  // Hide these in a ready to ensure that Drupal.ajax is set up first.
  $(function() {
    Drupal.ajax.prototype.commands.attr = function(ajax, data, status) {
      $(data.selector).attr(data.name, data.value);
    };


    Drupal.ajax.prototype.commands.redirect = function(ajax, data, status) {
      if (data.delay > 0) {
        setTimeout(function () {
          location.href = data.url;
        }, data.delay);
      }
      else {
        location.href = data.url;
      }
    };

    Drupal.ajax.prototype.commands.reload = function(ajax, data, status) {
      location.reload();
    };

    Drupal.ajax.prototype.commands.submit = function(ajax, data, status) {
      $(data.selector).submit();
    }
  });
})(jQuery);
;
/**
 * Provide the HTML to create the modal dialog.
 */
Drupal.theme.prototype.THEUMSModalThemeXlarge = function () {
  var html = '';

  html += '<div id="ctools-modal">';
  html += '  <div class="the-modal--xlarge the-modal--full-dialog ctools-modal-dialog modal-dialog the-student-registration-modal">';
  html += '    <div class="modal-content modal-content--ums-bg">';
  html += '      <div class="the-modal__close the-modal__close--no-header the-modal__close--black">';
  html += '       <a class="ctools-close-modal" href="#">';
  html +=            Drupal.CTools.Modal.currentSettings.closeText;
  html += '         </a>';
  html += '      </div>';
  html += '      <div class="the-modal__scroll the-modal__ie-noscroll the-modal__scroll--no-header"><div id="modal-content" class="the-modal__content--ums-modal the-modal__content the-modal__content--no-header modal-body"></div></div>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  return html;
};

Drupal.theme.prototype.THEUMSModalThemeXxlarge = function () {
  var html = '';

  html += '<div id="ctools-modal">';
  html += '  <div class="the-modal--xxlarge the-modal--full-dialog ctools-modal-dialog modal-dialog the-student-registration-modal">';
  html += '    <div class="modal-content modal-content--ums-bg">';
  html += '      <div class="the-modal__close the-modal__close--no-header the-modal__close--black">';
  html += '       <a class="the-ums-close-modal-confirm" href="#">';
  html +=            Drupal.CTools.Modal.currentSettings.closeText;
  html += '         </a>';
  html += '      </div>';
  html += '      <div class="the-modal__scroll the-modal__ie-noscroll the-modal__scroll--no-header"><div id="modal-content" class="the-modal__content--ums-modal the-modal__content the-modal__content--no-header modal-body"></div></div>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  return html;
};
;
(function ($) {
  "use strict";
  Drupal.behaviors.theUmsModalCloseConfirm = {
    attach: function (context, settings) {
      var $message = 'Are you sure you want to leave now?\n' +
        '\n' +
        'If you\'ve provided your email and created a password you are now registered on THE\n' +
        'Please click login when you return to the THE site';

      // Setup the link click
      $('.the-ums-close-modal-confirm', context)
        .once('the-ums-close-modal-confirm')
        .click(function () {
          let closeModal = confirm($message);
          if (closeModal) {
            Drupal.CTools.Modal.dismiss();
          }
          return false;
        });
    }
  }
}(jQuery));


(function($) {
  "use strict";
  Drupal.behaviors.theUmsModalEscCloseConfirm = {
    attach: function (context, settings) {

      var $message = 'Are you sure you want to leave now?\n' +
        '\n' +
        'If you\'ve provided your email and created a password you are now registered on THE\n' +
        'Please click login when you return to the THE site';

      // Unbind the original ctools escape key and bind our own
      $(document).unbind('keydown');

      var modalEventEscapeCloseHandler = function(event) {
        if (event.keyCode == 27) {
          console.log('ESC keydown detected');
          let closeModal = confirm($message);
          if (closeModal) {
            $(document).off('keydown', modalEventEscapeCloseHandler);
            console.log('Closing the modal because the user pressed ESC.');
            Drupal.CTools.Modal.dismiss();
            return false;
          } else {
            return false;
          }
        }
      }

      $('#modalContent').once('the-ums-modal-esc-confirm', function() {
        // console.log('attaching the esc confirm event');
        // $(document).on('keydown', modalEventEscapeCloseHandler);
      })
    }
  }
}(jQuery));
