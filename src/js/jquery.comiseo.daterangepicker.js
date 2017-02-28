/*!
 * jQuery UI date range picker widget
 * Copyright (c) 2016 Tamble, Inc.
 * Licensed under MIT (https://github.com/tamble/jquery-ui-daterangepicker/raw/master/LICENSE.txt)
 *
 * Depends:
 *   - jQuery 1.8.3+
 *   - jQuery UI 1.9.0+ (widget factory, position utility, button, menu, datepicker)
 *   - moment.js 2.3.0+
 */

(function($, window, undefined) {

	var uniqueId = 0, showMonths = false; // used for unique ID generation within multiple plugin instances

	$.widget('comiseo.daterangepicker', {
		version: '0.5.0',

		options: {
			// presetRanges: array of objects; each object describes an item in the presets menu
			// and must have the properties: text, dateStart, dateEnd.
			// dateStart, dateEnd are functions returning a moment object
			presetRanges: [
				{text: 'Today', dateStart: function() { return moment() }, dateEnd: function() { return moment() } },
				{text: 'Yesterday', dateStart: function() { return moment().subtract('days', 1) }, dateEnd: function() { return moment().subtract('days', 1) } },
				{text: 'Last 7 Days', dateStart: function() { return moment().subtract('days', 6) }, dateEnd: function() { return moment() } },
				{text: 'Last Week (Mo-Su)', dateStart: function() { return moment().subtract('days', 7).isoWeekday(1) }, dateEnd: function() { return moment().subtract('days', 7).isoWeekday(7) } },
				{text: 'Month to Date', dateStart: function() { return moment().startOf('month') }, dateEnd: function() { return moment() } },
				{text: 'Previous Month', dateStart: function() { return moment().subtract('month', 1).startOf('month') }, dateEnd: function() { return moment().subtract('month', 1).endOf('month') } },
				{text: 'Year to Date', dateStart: function() { return moment().startOf('year') }, dateEnd: function() { return moment() } }
			],
			initialText: 'Select date range...', // placeholder text - shown when nothing is selected
			icon: 'ui-icon-triangle-1-s',
			applyButtonText: 'Apply', // use '' to get rid of the button
			clearButtonText: 'Clear', // use '' to get rid of the button
			cancelButtonText: 'Cancel', // use '' to get rid of the button
			rangeSplitter: ' - ', // string to use between dates
			dateFormat: 'M d, yy', // displayed date format. Available formats: http://api.jqueryui.com/datepicker/#utility-formatDate
			altFormat: 'yy-mm-dd', // submitted date format - inside JSON {"start":"...","end":"..."}
			verticalOffset: 0, // offset of the dropdown relative to the closest edge of the trigger button
			mirrorOnCollision: true, // reverse layout when there is not enough space on the right
			autoFitCalendars: true, // override datepicker's numberOfMonths option in order to fit widget width
			applyOnMenuSelect: true, // whether to auto apply menu selections
			open: null, // callback that executes when the dropdown opens
			close: null, // callback that executes when the dropdown closes
			change: null, // callback that executes when the date range changes
			select: null, // callback that executes when the date range select
			clear: null, // callback that executes when the clear button is used
			cancel: null, // callback that executes when the cancel button is used
			onOpen: null, // @deprecated callback that executes when the dropdown opens
			onClose: null, // @deprecated callback that executes when the dropdown closes
			onChange: null, // @deprecated callback that executes when the date range changes
			onClear: null, // @deprecated callback that executes when the clear button is used
			datepickerOptions: { // object containing datepicker options. See http://api.jqueryui.com/datepicker/#options
				numberOfMonths: [10, 1],
//				showCurrentAtPos: 1 // bug; use maxDate instead
				maxDate: 0, // the maximum selectable date is today (also current month is displayed on the last position)
			}
		},

		_create: function() {
			this._dateRangePicker = buildDateRangePicker(this.element, this, this.options);
		},

		_destroy: function() {
			this._dateRangePicker.destroy();
		},

		_setOptions: function(options) {
			this._super(options);
			this._dateRangePicker.enforceOptions();
		},

		open: function() {
			this._dateRangePicker.open();
		},

		close: function() {
			this._dateRangePicker.close();
		},

		setRange: function(range) {
			this._dateRangePicker.setRange(range);
		},

		getRange: function() {
			return this._dateRangePicker.getRange();
		},

		clearRange: function() {
			this._dateRangePicker.clearRange();
		},

		widget: function() {
			return this._dateRangePicker.getContainer();
		}
	});

	/**
	 * factory for the trigger button (which visually replaces the original input form element)
	 *
	 * @param {jQuery} $originalElement jQuery object containing the input form element used to instantiate this widget instance
	 * @param {String} classnameContext classname of the parent container
	 * @param {Object} options
	 */
	function buildTriggerButton($originalElement, classnameContext, options) {
		var $self, id;

		function fixReferences() {
			id = 'drp_autogen' + uniqueId++;
			$('label[for="' + $originalElement.attr('id') + '"]')
				.attr('for', id);
		}

		function init() {
			fixReferences();
			$self = $('<button type="button"></button>')
				.addClass(classnameContext + '-triggerbutton')
				.attr({'title': $originalElement.attr('title'), 'tabindex': $originalElement.attr('tabindex'), id: id})
				.button({
					icons: {
						secondary: options.icon
					},
					label: options.initialText
				});
		}

		function getLabel() {
			return $self.button('option', 'label');
		}

		function setLabel(value) {
			$self.button('option', 'label', value);
		}

		function reset() {
			$originalElement.val('').change();
			setLabel(options.initialText);
		}

		function enforceOptions() {
			$self.button('option', {
				icons: {
					secondary: options.icon
				},
				label: options.initialText
			});
		}

		init();
		return {
			getElement: function() { return $self; },
			getLabel: getLabel,
			setLabel: setLabel,
			reset: reset,
			enforceOptions: enforceOptions
		};
	}

	/**
	 * factory for the presets menu (containing built-in date ranges)
	 *
	 * @param {String} classnameContext classname of the parent container
	 * @param {Object} options
	 * @param {Function} onClick callback that executes when a preset is clicked
	 */
	function buildPresetsMenu(classnameContext, options, onClick) {
		var $self,
			$menu,
			$toggleCalendars,
			translate_btns;

		function init() {
			translate_btns = options.datepickerOptions.calendarTriggerBtn || [];
			$self = $('<div></div>')
				.addClass(classnameContext + '-presets');

			$menu = $('<ul></ul>');
			$toggleCalendars = $('<div></div>', {'class': 'toggle toggle-modern'})
				.toggles({
					drag: true, // allow dragging the toggle between positions
					click: true, // allow clicking on the toggle
					text: {
						on: translate_btns.length? translate_btns[0] : 'Дни', // text for the ON position
						off: translate_btns.length? translate_btns[1] : 'Месяцы'// and off
					},
					on: false, // is the toggle ON on init
					animate: 300, // animation time (ms)
					easing: 'linear', // animation transition easing function
					checkbox: null, // the checkbox to toggle (for use in forms)
					clicker: null, // element that can be clicked on to toggle. removes binding from the toggle itself (use nesting)
					width: 80, // width used if not set in css
					height: 25, // height if not set in css
					// type: 'compact' // if this is set to 'select' then the select style toggle will be used
				})
				.on('toggle', function(e, active) {
					showMonths = active;
					toggleCalendarsVisible();
				});

			$.each(options.presetRanges, function() {
				$('<li><a href="#">' + this.text + '</a></li>')
					.data('dateStart', this.dateStart)
					.data('dateEnd', this.dateEnd)
					.click(onClick)
					.appendTo($menu);
			});

			$self.append($toggleCalendars);

			$self.append($menu);

			$menu.menu()
				.data('ui-menu').delay = 0; // disable submenu delays

			initialCalendarVisible();
		}

		function toggleCalendarsVisible() {
			var months_calendar = $('.' + classnameContext + '-calendar:not(".hasDatepicker")'),
				regular_calendar = $('.' + classnameContext + '-calendar.hasDatepicker');

			if (showMonths) {
				regular_calendar.css({'transform': 'translate(0, 0) scale(0)'});

				setTimeout(function () {
					regular_calendar.css({'display': 'none'});
					months_calendar.css({'display': 'table-cell'});
					setTimeout(function () {
						months_calendar.css({'transform': 'translate(0, 0) scale(1)'});
						months_calendar
							.find('.scroll_datepicker')
							.scrollTop(months_calendar.find('.ui-state-highlight').length?
								months_calendar
									.find('.ui-state-highlight')
									.filter(function (idx) {
										return months_calendar.find('.ui-state-highlight')[idx].offsetParent;
									})
									.last()[0]
									.offsetParent.offsetTop : 0);
					}, 150);
				}, 200);

			} else {
				months_calendar.css({'transform': 'translate(0, 0) scale(0)'});

				setTimeout(function () {
					months_calendar.css({'display': 'none'});
					regular_calendar.css({'display': 'table-cell'});
					setTimeout(function () {
						regular_calendar.css({'transform': 'translate(0, 0) scale(1)'});
						regular_calendar
							.find('.scroll_datepicker')
							.scrollTop(regular_calendar
								.filter(':visible')
								.find('td.ui-state-highlight:not(.ui-state-disabled)')
								.length?
							regular_calendar
								.filter(':visible')
								.find('td.ui-state-highlight:not(.ui-state-disabled)')
								.filter(function (idx) {
									return regular_calendar.find('td.ui-state-highlight:not(.ui-state-disabled)')[idx].offsetParent;
								})
								.last()[0]
								.offsetParent.offsetTop - 45 :

							regular_calendar
								.find('a.ui-state-active')
								.parent('td')
								.last()[0]
								.offsetParent.offsetTop - 45);
					}, 150);
				}, 200);
			}
		}

		function initialCalendarVisible() {
			var months_calendar = $('.' + classnameContext + '-calendar:not(".hasDatepicker")'),
				regular_calendar = $('.' + classnameContext + '-calendar.hasDatepicker');


			months_calendar.css({
				display: showMonths? 'table-cell' : 'none',
				transform: 'translate(0, 0) scale(0)'
			});
			regular_calendar.css({
				display: showMonths? 'none' : 'table-cell',
				transform: 'translate(0, 0) scale(1)'
			});
		}

		init();
		return {
			getElement: function() { return $self; }
		};
	}

	/**
	 * factory for the multiple month date picker
	 *
	 * @param {String} classnameContext classname of the parent container
	 * @param {Object} options
	 */
	function buildCalendar(classnameContext, options) {
		var $self,
			$months_self,
			range = {start: null, end: null}; // selected range

		function init() {
			$self = $('<div></div>', {'class': classnameContext + '-calendar ui-widget-content'});

			$self.datepicker($.extend({}, options.datepickerOptions, {beforeShowDay: beforeShowDay, onSelect: onSelectDay}));
			renderMonthDatepicker();
			updateAtMidnight();
		}

		function renderMonthDatepicker() {
			var year = moment(options.datepickerOptions.minDate).year();
			$months_self = $('<div></div>', {'class': classnameContext + '-calendar ui-widget-content months-calendar'});

			// create months calendar (append table)
			$months_self.append(function () {
				var $el = $('<div></div>', {
					'class': 'ui-datepicker-inline ui-datepicker ui-widget ui-widget-content ' +
					'ui-helper-clearfix ui-corner-all ui-datepicker-multi ' +
					'scroll_datepicker', 'style': 'display: block;'
				});

				for (var i = 0; i < moment().diff(options.datepickerOptions.minDate, "year") + 1; i++) {
					$el.append($('<div></div>', {'class': 'ui-datepicker-group', 'style': 'float: none;'})
						.append(renderMonthDatepickerHeader(year)) // calendar header
						.append(renderMonthDatepickerTable(year, 6)) // calendar table
					) // ui-datepicker-group
						.append($('<div></div>', {'class': 'ui-datepicker-row-break'})); // ui-datepicker-row
					year++;
				}

				return $el;
			});
		}

		function renderMonthDatepickerTable(period, td_width) {
			// @param 'period (Number) - year; ex.: 2017
			// @param 'td_width'(Number) - number of td in one row; ex.: 4 => return matrix 4x3

			var rows_length = Math.ceil(12 / td_width),
				month = 1, // month position from 1 to 12
				$table_root_elem = $('<table></table>', {'class': 'ui-datepicker-calendar'}),
				$tbody = $('<tbody></tbody>');

			// generate table
			for (var row = 0; row < rows_length; row++) { // build rows
				$tbody.append(function() {
					var $tr = $('<tr></tr>');

					for (var td = 0; td < td_width; td++) { // build tds
						var min_date = moment(Date.parse(options.datepickerOptions.minDate)).date(1),
							max_date = moment(Date.parse(options.datepickerOptions.maxDate)).endOf('month'),
							valid_date = moment(Date.parse(month + '-' + 1 + '-' + period)).date(1),
							expression = min_date > valid_date || valid_date > max_date;

						$tr.append(
							$('<td></td>', {'data-handler': 'onSelectMonth',
								'data-month': month,
								'data-year': period,
								'class': expression? 'ui-datepicker-unselectable ui-state-disabled' : ''
							})
								.append(
									$('<a></a>', {'class': 'ui-state-default'}).text(month)
								)
						);
						month++;
					}

					return $tr;
				});
			}

			$table_root_elem.append($tbody);

			var $selectable_months = $table_root_elem.find('a.ui-state-default');

			$selectable_months.click(function(e) {
				if (range.start != null && range.end != null) {
					refreshMonthDatepicker($selectable_months);
				}
				// $(this).toggleClass('ui-state-active');

				var $data = $(this).parent('td'),
					dateText = $data.attr('data-month') + '-' + 1 + '-' + $data.attr('data-year');

				onSelectDay(dateText, {fake_instance: true});
				beforeShowMonths();
			});

			$selectable_months.hover(function (e) {
				$(this).addClass('ui-state-hover');
				$(this).css({cursor: 'pointer'});
			}, function (e) {
				$(this).removeClass('ui-state-hover');
			});

			return $table_root_elem;
		}

		function renderMonthDatepickerHeader(period) {
			var $head_root_elem = $('<div></div>', {'class': 'ui-datepicker-header ui-widget-header ui-helper-clearfix ui-corner-all'}),
				$text_container_elem = $('<div></div>', {'class': 'ui-datepicker-title'}),
				$text_elem = $('<span></span>', {'class': 'ui-datepicker-year'}).text(period);

			$head_root_elem.append(
				$text_container_elem.append(
					$text_elem
				)
			);

			return $head_root_elem;
		}

		function enforceOptions() {
			showMonths = false;
			$self.datepicker('option', $.extend({}, options.datepickerOptions, {beforeShowDay: beforeShowDay, onSelect: onSelectDay}));
			translateMonths();
		}

		// called when a day is selected
		function onSelectDay(dateText, instance) {
			var dateFormat, selectedDate;
			if (typeof instance !== 'undefined' && instance.hasOwnProperty('fake_instance')) {
				selectedDate = moment(Date.parse(dateText)).toDate();
			} else {
				dateFormat = options.datepickerOptions.dateFormat || $.datepicker._defaults.dateFormat;
				selectedDate = $.datepicker.parseDate(dateFormat, dateText);
			}

			if (!range.start || range.end) { // start not set, or both already set
				range.start = selectedDate;
				range.end = null;
			} else if (selectedDate < range.start) { // start set, but selected date is earlier
				range.end = instance.hasOwnProperty('fake_instance')?
					moment(range.start).endOf('month').toDate() :
					range.start;
				range.start = selectedDate;
			} else {
				range.end = instance.hasOwnProperty('fake_instance')?
					moment(selectedDate).endOf('month').toDate() :
					selectedDate;
			}
			if (options.datepickerOptions.hasOwnProperty('onSelect')) {
				options.datepickerOptions.onSelect(dateText, instance);
			}
			beforeShowMonths();
			refresh();
		}

		// called for each day in the datepicker before it is displayed
		function beforeShowDay(date) {
			var result = [
					true, // selectable
					range.start && ((+date === +range.start) || (range.end && range.start <= date && date <= range.end)) ? 'ui-state-highlight' : '' // class to be added
				],
				userResult = [true, '', ''];

			if (options.datepickerOptions.hasOwnProperty('beforeShowDay')) {
				userResult = options.datepickerOptions.beforeShowDay(date);
			}
			return [
				result[0] && userResult[0],
				result[1] + ' ' + userResult[1],
				userResult[2]
			];
		}

		// highlight selected months
		function beforeShowMonths() {
			$months_self.find('a.ui-state-default').each(function () {
				var month, year, date;

				month = $(this).parent().attr('data-month');
				year = $(this).parent().attr('data-year');
				date = moment(Date.parse(month + '-' + 1 + '-' + year)).toDate();

				if ((+date === +moment(range.start).date(1).startOf("day").toDate()) || (range.end && range.start <= date && date <= range.end)) {
					$(this).parent().addClass('ui-state-highlight');
				} else {
					$(this).parent().removeClass('ui-state-highlight');
				}
			});
		}

		function updateAtMidnight() {
			setTimeout(function() {
				refresh();
				updateAtMidnight();
			}, moment().endOf('day') - moment());
		}

		function scrollToRangeStart() {
			if (range.start) {
				$self.datepicker('setDate', range.start);
				setTimeout(function () {
					showMonths?
						$months_self
							.find('.scroll_datepicker')
							.scrollTop($months_self.find('.ui-state-highlight').length?
								$months_self
									.find('.ui-state-highlight')
									.last()[0]
									.offsetParent.offsetTop : 0) :
						$self
							.find('.scroll_datepicker')
							.scrollTop($self.find('td.ui-state-highlight:not(.ui-state-disabled)').length?
							$self
								.find('td.ui-state-highlight:not(.ui-state-disabled)')
								.last()[0]
								.offsetParent.offsetTop - 45 :
							$self
								.find('.ui-state-active')
								.parent('td')
								.last()[0]
								.offsetParent.offsetTop - 45);
				}, 300);
			}
		}

		function refresh() {
			//fix selected past range scroll to current date
			$self.datepicker('refresh');
			// beforeShowMonths();
			// $self.datepicker('setDate', null); // clear the selected date
		}

		function refreshMonthDatepicker(domNodes) {
			range = {start: null, end: null};
			domNodes.each(function() {$(this).parent().removeClass('ui-state-active');});
		}

		function reset() {
			range = {start: null, end: null};
			refresh();
		}

		function translateMonths() {
			var translates = options.datepickerOptions.monthNames || [];
			if (translates.length) {
				translates = translates.map(function (i) { return i.slice(0, 3); });
				$months_self.find('td').each(function () {
					$(this).find('a').text(translates[$(this).attr('data-month') - 1]);
				});
			}
		}

		init();
		return {
			getElement: function() { return $self; },
			getMonthElement: function() { return $months_self; },
			scrollToRangeStart: function() { return scrollToRangeStart(); },
			getRange: function() { return range; },
			setRange: function(value) { range = value; refresh(); beforeShowMonths(); },
			refresh: refresh,
			reset: reset,
			enforceOptions: enforceOptions
		};
	}

	/**
	 * factory for the button panel
	 *
	 * @param {String} classnameContext classname of the parent container
	 * @param {Object} options
	 * @param {Object} handlers contains callbacks for each button
	 */
	function buildButtonPanel(classnameContext, options, handlers) {
		var $self,
			applyButton,
			clearButton,
			cancelButton;

		function init() {
			$self = $('<div></div>')
				.addClass(classnameContext + '-buttonpanel');

			if (options.applyButtonText) {
				applyButton = $('<button type="button" class="ui-priority-primary"></button>')
					.text(options.applyButtonText)
					.button();

				$self.append(applyButton);
			}

			if (options.clearButtonText) {
				clearButton = $('<button type="button" class="ui-priority-secondary"></button>')
					.text(options.clearButtonText)
					.button();

				$self.append(clearButton);
			}

			if (options.cancelButtonText) {
				cancelButton = $('<button type="button" class="ui-priority-secondary"></button>')
					.text(options.cancelButtonText)
					.button();

				$self.append(cancelButton);
			}

			bindEvents();
		}

		function enforceOptions() {
			if (applyButton) {
				applyButton.button('option', 'label', options.applyButtonText);
			}

			if (clearButton) {
				clearButton.button('option', 'label', options.clearButtonText);
			}

			if (cancelButton) {
				cancelButton.button('option', 'label', options.cancelButtonText);
			}
		}

		function bindEvents() {
			if (handlers) {
				if (applyButton) {
					applyButton.click(handlers.onApply);
				}

				if (clearButton) {
					clearButton.click(handlers.onClear);
				}

				if (cancelButton) {
					cancelButton.click(handlers.onCancel);
				}
			}
		}

		init();
		return {
			getElement: function() { return $self; },
			enforceOptions: enforceOptions
		};
	}

	/**
	 * factory for the widget
	 *
	 * @param {jQuery} $originalElement jQuery object containing the input form element used to instantiate this widget instance
	 * @param {Object} instance
	 * @param {Object} options
	 */
	function buildDateRangePicker($originalElement, instance, options) {
		var classname = 'comiseo-daterangepicker',
			$container, // the dropdown
			$mask, // ui helper (z-index fix)
			triggerButton,
			presetsMenu,
			calendar,
			buttonPanel,
			isOpen = false,
			autoFitNeeded = false,
			LEFT = 0,
			RIGHT = 1,
			TOP = 2,
			BOTTOM = 3,
			sides = ['left', 'right', 'top', 'bottom'],
			hSide = RIGHT, // initialized to pick layout styles from CSS
			vSide = null;

		function init() {
			triggerButton = buildTriggerButton($originalElement, classname, options);
			presetsMenu = buildPresetsMenu(classname, options, usePreset);
			calendar = buildCalendar(classname, options);

			autoFit.numberOfMonths = options.datepickerOptions.numberOfMonths; // save initial option!
			// if (autoFit.numberOfMonths instanceof Array) { // not implemented
			// 	options.autoFitCalendars = false;
			// }
			buttonPanel = buildButtonPanel(classname, options, {
				onApply: function (event) {
					close(event);
					setRange(null, event);
				},
				onClear: function (event) {
					close(event);
					clearRange(event);
				},
				onCancel: function (event) {
					instance._trigger('cancel', event, {instance: instance});
					close(event);
					reset();
				}
			});
			render();
			autoFit();
			reset();
			bindEvents();
		}

		function render() {
			$container = $('<div></div>', {'class': classname + ' ' + classname + '-' + sides[hSide] + ' ui-widget ui-widget-content ui-corner-all ui-front'})
				.append($('<div></div>', {'class': classname + '-main ui-widget-content'})
					.append(presetsMenu.getElement())
					.append(calendar.getElement())
					.append(calendar.getMonthElement())
				)
				.append($('<div class="ui-helper-clearfix"></div>').append(buttonPanel.getElement()))
				.hide();

			$container.find(".ui-datepicker-inline").addClass("scroll_datepicker");
			$originalElement.hide().after(triggerButton.getElement());
			$mask = $('<div></div>', {'class': 'ui-front ' + classname + '-mask'}).hide();
			$('body').append($mask).append($container);
		}

		// auto adjusts the number of months in the date picker
		function autoFit() {
			if (options.autoFitCalendars) {
				var maxWidth = $(window).width(),
					initialWidth = $container.outerWidth(true),
					$calendar = calendar.getElement(),
					numberOfMonths = $calendar.datepicker('option', 'numberOfMonths'),
					initialNumberOfMonths = numberOfMonths;

				if (initialWidth > maxWidth) {
					while (numberOfMonths > 1 && $container.outerWidth(true) > maxWidth) {
						$calendar.datepicker('option', 'numberOfMonths', --numberOfMonths);
					}
					if (numberOfMonths !== initialNumberOfMonths) {
						autoFit.monthWidth = (initialWidth - $container.outerWidth(true)) / (initialNumberOfMonths - numberOfMonths);
					}
				} else {
					while (numberOfMonths < autoFit.numberOfMonths && (maxWidth - $container.outerWidth(true)) >= autoFit.monthWidth) {
						$calendar.datepicker('option', 'numberOfMonths', ++numberOfMonths);
					}
				}
				reposition();
				autoFitNeeded = false;
			}
		}

		function destroy() {
			$container.remove();
			triggerButton.getElement().remove();
			$originalElement.show();
		}

		function bindEvents() {
			triggerButton.getElement().click(toggle);
			triggerButton.getElement().keydown(keyPressTriggerOpenOrClose);
			$mask.click(function(event) {
				close(event);
				reset();
			});
			$(window).resize(function() { isOpen ? autoFit() : autoFitNeeded = true; });
		}

		function formatRangeForDisplay(range) {
			if (typeof range.start == "string") {
				range.start = new Date(range.start);
			}
			if (typeof range.end == "string") {
				range.end = new Date(range.end);
			}
			if (moment.isMoment(range.start)) {
				range.start = moment(range.start).toDate();
			}
			if (moment.isMoment(range.end)) {
				range.end = moment(range.end).toDate();
			}
			var dateFormat = options.dateFormat;
			return $.datepicker.formatDate(dateFormat, range.start) + (+range.end !== +range.start ? options.rangeSplitter + $.datepicker.formatDate(dateFormat, range.end) : '');
		}

		// formats a date range as JSON
		function formatRange(range) {
			var dateFormat = options.altFormat,
				formattedRange = {};
			formattedRange.start = $.datepicker.formatDate(dateFormat, range.start);
			formattedRange.end = $.datepicker.formatDate(dateFormat, range.end);
			return JSON.stringify(formattedRange);
		}

		// parses a date range in JSON format
		function parseRange(text) {
			var dateFormat = options.altFormat,
				range = null;
			if (text) {
				try {
					range = JSON.parse(text, function(key, value) {
						return key ? $.datepicker.parseDate(dateFormat, value) : value;
					});
				} catch (e) {
					if (typeof text == "object") {
						range = text;
					}
				}
			}
			return range;
		}

		function reset() {
			var range = getRange();
			if (range) {
				triggerButton.setLabel(formatRangeForDisplay(range));
				calendar.setRange(range);
			} else {
				calendar.reset();
			}
		}

		function setRange(value, event) {
			var range = value || calendar.getRange();

			if (!range.start) {
				return;
			}
			if (!range.end) {
				range.end = showMonths?
					moment(range.start).endOf('month').toDate() :
					range.start;
			}
			if (showMonths && !options.datepickerOptions.prev) {
				if (range.start < options.datepickerOptions.minDate) {
					range.start = options.datepickerOptions.minDate;
				}
				if (range.end > options.datepickerOptions.maxDate) {
					range.end = options.datepickerOptions.maxDate;
				}
			}
			value && calendar.setRange(range);
			triggerButton.setLabel(formatRangeForDisplay(range));
			$originalElement.val(formatRange(range)).change();
			if (options.onChange) {
				options.onChange();
			}
			instance._trigger('change', event, {instance: instance});
		}

		function getRange() {
			return parseRange($originalElement.val());
		}

		function clearRange(event) {
			triggerButton.reset();
			calendar.reset();
			if (options.onClear) {
				options.onClear();
			}
			instance._trigger('clear', event, {instance: instance});
		}

		// callback - used when the user clicks a preset range
		function usePreset(event) {
			setTimeout(function () {
				calendar.getElement()
					.find('.ui-datepicker-calendar')
					.find('a.ui-state-active')
					.removeClass('ui-state-active');
			}, 200);
			var $this = $(this),
				start = $this.data('dateStart')().startOf('day').toDate(),
				end = $this.data('dateEnd')().startOf('day').toDate();
			calendar.setRange({ start: start, end: end });
			if (options.applyOnMenuSelect) {
				close(event);
				setRange(null, event);
			}
			calendar.scrollToRangeStart();
			return false;
		}

		// adjusts dropdown's position taking into account the available space
		function reposition() {
			$container.position({
				my: 'left top',
				at: 'left bottom' + (options.verticalOffset < 0 ? options.verticalOffset : '+' + options.verticalOffset),
				of: triggerButton.getElement(),
				collision : 'flipfit flipfit',
				using: function(coords, feedback) {
					var containerCenterX = feedback.element.left + feedback.element.width / 2,
						triggerButtonCenterX = feedback.target.left + feedback.target.width / 2,
						prevHSide = hSide,
						last,
						containerCenterY = feedback.element.top + feedback.element.height / 2,
						triggerButtonCenterY = feedback.target.top + feedback.target.height / 2,
						prevVSide = vSide,
						vFit; // is the container fit vertically

					hSide = (containerCenterX > triggerButtonCenterX) ? RIGHT : LEFT;
					if (hSide !== prevHSide) {
						if (options.mirrorOnCollision) {
							last = (hSide === LEFT) ? calendar : presetsMenu;
							$container.children().first().append(last.getElement());
						}
						$container.removeClass(classname + '-' + sides[prevHSide]);
						$container.addClass(classname + '-' + sides[hSide]);
					}
					$container.css({
						left: coords.left,
						top: coords.top
					});

					vSide = (containerCenterY > triggerButtonCenterY) ? BOTTOM : TOP;
					if (vSide !== prevVSide) {
						if (prevVSide !== null) {
							triggerButton.getElement().removeClass(classname + '-' + sides[prevVSide]);
						}
						triggerButton.getElement().addClass(classname + '-' + sides[vSide]);
					}
					vFit = vSide === BOTTOM && feedback.element.top - feedback.target.top !== feedback.target.height + options.verticalOffset
						|| vSide === TOP && feedback.target.top - feedback.element.top !== feedback.element.height + options.verticalOffset;
					triggerButton.getElement().toggleClass(classname + '-vfit', vFit);
				}
			});
		}

		function killEvent(event) {
			event.preventDefault();
			event.stopPropagation();
		}

		function keyPressTriggerOpenOrClose(event) {
			switch (event.which) {
				case $.ui.keyCode.UP:
				case $.ui.keyCode.DOWN:
					killEvent(event);
					open(event);
					return;
				case $.ui.keyCode.ESCAPE:
					killEvent(event);
					close(event);
					reset();
					return;
				case $.ui.keyCode.TAB:
					close(event);
					return;
			}
		}

		function open(event) {
			if (!isOpen) {
				triggerButton.getElement().addClass(classname + '-active');
				$mask.show();
				isOpen = true;
				autoFitNeeded && autoFit();
				calendar.scrollToRangeStart();
				$container.show();
				reposition();
			}
			if (options.onOpen) {
				options.onOpen();
			}
			instance._trigger('open', event, {instance: instance});
		}

		function close(event) {
			if (isOpen) {
				$container.hide();
				$mask.hide();
				triggerButton.getElement().removeClass(classname + '-active');
				isOpen = false;
			}
			if (options.onClose) {
				options.onClose();
			}
			instance._trigger('close', event, {instance: instance});
		}

		function select(event) {
			instance._trigger("select", event, {instance: instance});
		}

		function toggle(event) {
			if (isOpen) {
				close(event);
				reset();
			}
			else {
				open(event);
			}
		}

		function getCalendar() {
			return calendar;
		}

		function getContainer() {
			return $container;
		}

		function enforceOptions() {
			var oldPresetsMenu = presetsMenu;
			presetsMenu = buildPresetsMenu(classname, options, usePreset);
			oldPresetsMenu.getElement().replaceWith(presetsMenu.getElement());
			calendar.enforceOptions();
			buttonPanel.enforceOptions();
			triggerButton.enforceOptions();
			var range = getRange();
			if (range) {
				triggerButton.setLabel(formatRangeForDisplay(range));
			}
		}

		init();
		return {
			toggle: toggle,
			destroy: destroy,
			open: open,
			close: close,
			setRange: setRange,
			getRange: getRange,
			clearRange: clearRange,
			reset: reset,
			select: select,
			enforceOptions: enforceOptions,
			getContainer: getContainer,
			getCalendar: getCalendar
		};
	}

})(jQuery, window);
