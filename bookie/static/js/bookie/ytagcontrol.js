/*jslint eqeqeq: false, browser: true, debug: true, onevar: true,
         plusplus: false, newcap: false, */
/*global _: false, window: false, self: false, escape: false, */

/**
 * ripped off from
 * https://github.com/yui/yui3-gallery/blob/master/src/gallery-taglist/js/taglist.js
 *
 * Hope to submit to the gallery either as a giant patch or something. For
 * now, will hack it directly into Bookie .
 */

YUI.add('bookie-tagcontrol', function (Y) {
    var ns = Y.namespace('bookie');
    var AJAX_WAITTIME = 325;

    var keymap = {
        downArrow: 40,
        upArrow: 38,
        enter: 13,
        space: 32,
        tab: 9,
        backspace: 8
    };

    /**
     * Class for each Tag item in our list of tags we control
     *
     */
    function Tag(config) {
        Tag.superclass.constructor.apply(this, arguments);
    }

    Tag.NAME = 'tagcontroller-tag';
    Tag.ATTRS = {
        // The actual text of this tag.
        text: {
            required: true
        },
        // The css class we stick on all Tag dom nodes
        cssClass: {
            required: true
        },
        // should we fire the event that we've been added?
        // we don't want to when adding initial tags on page load
        silent: {
            value: false
        }
    };

    Y.extend(Tag, Y.Base, {
        // bind all events for this particular tag
        _bind: function () {
            // if clicked on, remove it
            this.ui.on('click', this.destroy, this);
        },

        // generate the html for our tag to be placed into the control
        _buildui: function () {
            var ui = Y.Node.create('<li/>');

            ui.addClass(this.get('cssClass'));
            ui.setContent(this.get('text'));
            ui.set('title', 'Click to remove...');
            return ui;
        },

        /**
         * Provide specific destroy() implementation
         *
         * When we get told to go away, we need to clean up html as well as
         * our object instance. The controller also wants to know that we're
         * leaving, so make sure we fire an event so it can update itself as
         * well.
         *
         */
        destructor: function () {
            // remove this node
            this.ui.remove();
            Y.fire('tag:removed', {
                target: this
            });
        },

        /**
         * YUI object init method
         *
         */
        initializer: function (cfg, silent) {
            this.ui = this._buildui();
            this._bind();

            if (cfg.tag_string) {
                // split the string on spaces
                // and add each one
                Y.Array.each(cfg.tag_string.split(' '), function (val) {
                    this._add(val);
                });
            }

            if (!this.get('silent')) {
                Y.fire('tag:added', {
                    target: this
                });
            }
        }
    });

    ns.TagControl = Y.Base.create('bookie-tagcontrol', Y.Widget, [], {
        CLONE_CSS: {
            height: '1em',
            left: -9999,
            opacity: 0,
            overflow: 'hidden',
            position: 'absolute',
            top: -9999,
            width: 'auto'
        },

        tpl: {
            main: '<div><ul><li><input/></li></ul></div>',
            submit_button: '<input type="submit" name="filter" value="Go"/>'
        },

        /**
         * Add the tag text into our control as a tag object
         *
         * Requires building an instance, adding the UI to the control, and
         * making sure we're updating our srcNode with the list of tags for
         * form submitting later on.
         *
         */
        _add: function (current_text, silent) {
            var that = this;
            // only add if there's text here
            current_text = Y.Lang.trim(current_text);

            if (current_text) {
                var input = this.ui.one('input'),
                    parent = input.get('parentNode'),
                    new_tag = new Tag({
                        text: current_text,
                        cssClass: this.getClassName('item'),
                        parent: this.ui,
                        silent: silent
                    });

                // keep this up
                this.get('tags').push(new_tag);

                // add a new li element before the input one
                parent.get('parentNode').insertBefore(new_tag.ui, parent);

                // fire an event that a new tag was added
                if (!silent) {
                    this.set('events_waiting', true);
                }
            }
        },

        /**
         * Handle the user manually adding a tag from the control UI
         *
         * They can add a tag by hitting space or enter from the control since
         * that's basically saying that "hey, done with this tag, let's move
         * on to the next one".
         *
         */
        _added_tag: function () {
            var input = this.ui.one('input'),
                current_text = input.get('value');

            this._add(current_text);

            // clear the input
            input.set('value', '');

            // focus on the input
            input.focus();
        },

        /**
         * Bind all events the control is looking for and processing.
         *
         */
        _bind_events: function () {
            var that = this;
            // events to watch out for from our little control
            // tag:added
            // tag:removed
            // focus out (make last word a tag)
            this.ui.delegate(
                'keyup',
                this._parse_input,
                'input',
                this
            );

            // we also want to parse_input on any click event in case you
            // remove a tag and we need to set the timer/update
            this.ui.delegate('mouseup', this._parse_input, 'li', this);

            // if you mouse down then check if this is an autcomplete we need
            // to force adding with
            this.ac.after('select', this._parse_input, this);

            this.ui.delegate('tag:donetyping', function (e) {
                that._fire_changed();
            });

            // if you click on anywhere within the ui, focus the input box
            this.ui.on('click', function (e) {
                this.ui.one('.' + this.getClassName('input')).focus();
            }, this);

            // if a tag is removed, catch that event and remove it from our
            // knowledge. This event is coming from the tag itself.
            Y.on('tag:removed', this._remove_tag, this);

            // Look at adjusting the size on any value change event including
            // pasting and such.
            this.ui.one('input').on('valueChange', function (e) {
                this._update_input_width(e.newVal);
            }, this);

        },

        /**
         * We need a clone node in order to tell the input how large to be
         *
         */
        _build_clone: function () {
            var clone = Y.Node.create('<span/>');
            clone.setContent('');
            clone.setStyles(this.CLONE_CSS);
            // remove attributes so we don't accidentally grab this node in
            // the future
            clone.generateID();
            clone.setAttrs({
                'tabIndex': -1
            });

            this.get('srcNode').get('parentNode').append(clone);
            this.clone = clone;
            this._update_input_width('');
        },

        /**
         * Generate the html layout for our control.
         *
         * We need to make sure we stick on the nice namespaced css classes
         * for our styling to hook into.
         *
         */
        _buildui: function () {
            this.ui = Y.Node.create(this.tpl.main);
            this.ui.one('ul').addClass(this.getClassName('tags'));
            this.ui.one('li').addClass(this.getClassName('item'));
            this.ui.one('li').addClass(this.getClassName('item-input'));
            this.ui.one('input').addClass(this.getClassName('input'));

            // if we want a submit button, dump that into play
            if (this.get('with_submit')) {
                this.ui.appendChild(this.tpl.submit_button);
            }
        },

        _fetch_suggestions: function (qry, callback) {
            this.ac.api = new Y.bookie.Api.route.TagComplete(
                this.get('api_cfg')
            );

            var callback_handler = function (data) {
                // we need to parse out the list of suggestions and feed that
                // to the YUI callback for autocomplete
                callback(data.tags);
            };

            if (this.get('tags')) {
                var tags = Y.Array.map(this.get('tags'), function (t) {
                    return t.get('text')
                }).join(' ');
            } else {
                tags = undefined;
            }

            this.ac.api.call({
                    success: callback_handler
                },
                qry,
                tags
            );
        },

        _fire_changed: function () {
            var that = this;
            Y.fire('tag:changed', {
                target: that,
                tags: Y.Array.map(that.get('tags'), function (t) {
                    return t.get('text')
                })
            });
        },

        /**
         * Check the input for any actions we should take as the user types
         * into the input control.
         *
         */
        _parse_input: function (e) {
            var that = this;

            // you're typing, so let's start a timer to check if you're done
            // in a sec
            clearTimeout(this.typing_lock);

            this.typing_lock = setTimeout(function () {
                // check for any events to fire changed for
                if (that.get('events_waiting')) {
                    that._fire_changed();
                    that.set('events_waiting', undefined);
                }
            }, AJAX_WAITTIME);

            if (e.keyCode == keymap.backspace) {
                if (this.ui.one('input').get('value') == '') {
                    // remove the last tag we put on the stack
                    var last_tag = this.get('tags').pop();
                    last_tag.destroy();
                }
            }

            // continue on with what you were doing
            // these are events and keystrokes we want to throttle
            // external activity for
            if (e.keyCode === keymap.space ||
                    e.keyCode === keymap.enter ||
                    e.keyCode === keymap.tab ||
                    e.type === 'autocompleteList:select') {
                // then handle the current input as a tag and clear for a
                // new one
                that._added_tag();
                this._sync_tags();
            }
        },

        /**
         * Add any tags that a srcNode already has in it
         *
         */
        _process_existing: function () {
            // check the srcNode for any existing value=""
            var that = this,
                val = Y.Lang.trim(this.get('srcNode').get('value')),
                tags = [];

            if (val.length > 0) {
                tags = val.split(' ');
            }

            if (tags.length > 0) {
                Y.Array.each(tags, function (n) {
                    that._add(n, true);
                });
            }
        },

        /**
         * When a tag is deleted, we need to update our own record of it.
         *
         */
        _remove_tag: function (e) {
            var that = this,
                t = e.target,
                tag = t.get('text');
            Y.Array.find(this.get('tags'), function (item, index, list) {
                this.get('tags')[1];

                if (item.get('text') === tag) {
                    var tlist = this.get('tags');
                    tlist.splice(index, 1);
                    this.set('tags', tlist);
                    return true;
                }

            }, this);

            this._sync_tags();
            this.set('events_waiting', true);
        },

        /**
         * We need to setup the autocomplete onto out input widget
         *
         */
        _setup_autocomplete: function () {
            var that = this,
                fetch_wrapper = function (qry, callback) {
                    that._fetch_suggestions(qry, callback);
                };

            // not rendered immediately
            this.ac = new Y.AutoComplete({
                inputNode: this.ui.one('input'),
                queryDelay: 150,
                source: fetch_wrapper
            });
        },

        /**
         * Sync up the list of tags the control knows about to the srcNode
         * input element.
         *
         */
        _sync_tags: function () {
            // make sure we keep the tags in our list up to date with the
            // input box
            var tag_list = Y.Array.reduce(
                this.get('tags'),
                '',
                function (prev, cur, index, array) {
                    if (prev.length > 0) {
                        return [prev, cur.get('text')].join(' ');
                    } else {
                        return cur.get('text');
                    }
                },
                this
            );

            this.get('srcNode').set('value', tag_list);
        },

        /**
         * Update the css width of the clone node.
         *
         * In the process of page dom manipulation, the width might change
         * based on other nodes showing up and forcing changes due to
         * padding/etc.
         *
         * We'll play safe and just always recalc the width for the clone
         * before we check it's scroll height.
         *
         */
        _update_input_width: function (new_value) {
            // we need to update the clone with the content so it resizes
            this.clone.setContent(new_value);

            // then update the input to be the matching size + a buffer
            this.ui.one('input').setStyle(
                'width',
                this.clone.get('offsetWidth') + 20
            );
        },

        /**
         * Override the YUI widget method for binding UI events
         *
         */
        bindUI: function () {
            this._bind_events();
            this.typing = false;
        },

        initializer: function (cfg) {
            var that = this;
            // check to see if we have any existing tags to use in the
            // tagcontrol
            if (cfg.initial_tags) {
                this.get('srcNode').set('value', cfg.initial_tags.join(' '));
            }
        },

        /**
         * Override the YUI widget method for building out html/rendering.
         *
         */
        renderUI: function () {
            // first start out by hiding the initial input and placing our own
            // in it's place
            var target = this.get('srcNode'),
                parent = target.get('parentNode');

            // make the target a hidden field so it still gets passed to forms
            // submitted
            target.set('type', 'hidden');

            this._buildui();
            this.ui.appendTo(parent);
            this._build_clone();
            this._setup_autocomplete();

            // render the auto complete widget
            this.ac.render();
        },

        /**
         * Override the YUI widget method for init'ing the UI per existing
         * data.
         *
         */
        syncUI: function () {
            // handle init'ing if there are initial values in the input box
            this._process_existing();
        }
    }, {
        ATTRS: {
            /**
             * We need an api_cfg if we're going to have autocomplete results
             *
             */
             api_cfg: {
             },

            /**
             * A stack to shove events onto and process
             *
             */
            events_waiting: {
                value: false
            },

            /**
             * Tags is a list of Tag object instances we know about
             *
             */
            tags: {
                value: [],

                // this cannot be null or undefined, so make sure we
                // always set to a list
                setter: function (val, name) {

                    if (!Y.Lang.isArray(val)) {
                        return [];
                    } else {
                        return val;
                    }
                }
            },

            with_submit: {
                value: true
            }
        },
    });

}, '0.1.0', {
    requires: [
        'autocomplete', 'autocomplete-highlighters', 'base', 'widget',
        'handlebars', 'array-extras', 'event-valuechange'
    ]
});