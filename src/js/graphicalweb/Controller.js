/*global define $ TWEEN requestAnimationFrame TALKING_POINTS*/
define(['graphicalweb/events/UserEvent', 
        'graphicalweb/events/StateEvent', 
        'graphicalweb/controllers/AudioController',
        'graphicalweb/models/AssetModel',
        'graphicalweb/models/VarsModel'],

	function (UserEvent, StateEvent, Audio, AssetModel, VarsModel) {
		
		var Controller = function (view, model) {
			var instance = this,
                History,
                State,
                transitioning = false,
                waiting = false,
                $soundbtn,
                talkpointAnims = ['', 'talkanim2', 'talkanim3', 'talkanim4'],
                hotkeys = '1234567890',
                $window,
                $document;

//private

            function talkPointOut() {
                $('.talkingpoint').fadeOut(200, function () {
                    $(this).remove();    
                });
            }

            function talkPointIn(num) {
                var $tp,
                    arrayGroup,
                    currentState = model.getCurrentState();

                arrayGroup = currentState.id - 2;

                if (arrayGroup > -1 && arrayGroup < TALKING_POINTS.length) {
                    if (num > -1 && num < TALKING_POINTS[arrayGroup].length) {
                        $tp = $('<div class="talkingpoint">');
                        $tp.html(TALKING_POINTS[arrayGroup][num]);
                        $('#main').append($tp);
                        $tp.fadeIn();
                    }
                }
            }

            function runTalkPoint(num) {
                if ($('.talkingpoint').length === 0) {
                    talkPointIn(num);
                } else if ($('.talkingpoint').length == 1) {
                    talkPointOut();
                }
            }

    //event handlers

            //function handle_SECTION_READY(e) {
            //    view.startSection();
            //}
            
            /**
             * preload for direct link
             **/
            function handle_SCENERY_LOAD_PROGRESS(e) {
                var percent = Math.round(e.loaded * 100);
                percent = percent == 100 ? '' : percent;
                $('#preloader .spinner').text(percent);
            }

            /**
             * scenery loaded for direct link
             */
            function handle_SCENERY_LOADED() {
                var initialState = model.getCurrentState();
                $('#preloader').hide();
                view.gotoSection(initialState.id);
            }
            
            function handle_ANIM_IN_COMPLETE(e) {
                transitioning = false;
            }

            function handle_SECTION_DESTROY(e) {
                view.initSection();
            }

            function handle_STATE_CHANGE(e) {
                var newSection, 
                    state, 
                    uri = window.location.pathname;

                uri = uri !== '/' ? uri.replace('/', '') : uri;                 
                state = model.getStateByURL(uri);
                model.setCurrentState(state.id);  //get from uri

                newSection = model.getCurrentState();
                view.gotoSection(newSection.id);
            }

            function handle_WAIT_FOR_INTERACTION() {
                var currentState = model.getCurrentState(),
                    stateList = model.getStates();
            }

            /**
             * if not at last phase, iterate through view's phases
             */
            function handle_NEXT() {
                var currentState,
                    currentView,
                    nextState,
                    stateList;

                stateList = model.getStates();
                currentState = model.getCurrentState();
                currentView = stateList[currentState.id].view;

                if (VarsModel.SOUND !== false) {
                    Audio.stopDialogue();
                }

                if (currentView.phase == currentView.phaselength || VarsModel.PRESENTATION !== true) {
                    //goto next section
                    if (transitioning !== true && currentState.id < 9) {
                        transitioning = true;
                        nextState = model.getStateByInt(currentState.id + 1);
                        model.setCurrentState(nextState.id);

                        History.pushState(null, null, nextState.url);
                    }
                } else {
                    //iterate inside section
                    if (transitioning !== true && currentView.phase < currentView.phaselength) {
                        currentView.next();
                    }
                }
            }

            function handle_PREVIOUS() {
                var currentState,
                    currentView,
                    prevState;

                currentState = model.getCurrentState();
                prevState = model.getStateByInt(currentState.id - 1);
                currentView = currentState.view;

                if (VarsModel.SOUND !== false) {
                    Audio.stopDialogue();
                }

                if (currentView.phase < 2 || VarsModel.PRESENTATION !== true) {
                    if (transitioning !== true && currentState.id > 1) {
                        transitioning = true;
                        model.setCurrentState(prevState.id);

                        History.pushState(null, null, prevState.url);
                    }
                } else {
                    if (transitioning !== true && currentView.phase > 0) {
                        currentView.prev();
                    }
                }
            }

            function handle_NAV_CLICK(id) {
                var state = model.getStateByInt(id);
                
                if (transitioning !== true) {
                    transitioning = true;
                    model.setCurrentState(state.id);
                    History.pushState(null, null, state.url);
                }
            }

            function handle_INFO_CLICK() {
                view.showPanel();
            }

            function handle_SLIDE_IN(slide) {
                view.showSlide(slide);
            }

            function handle_SLIDES_OUT() {
                view.hideSlide();
            }

            function handle_SOUND_CLICK() {
                if (Audio.sound === true) {
                    Audio.off();
                    $soundbtn.addClass('off');
                } else {
                    Audio.on();
                    $soundbtn.removeClass('off');
                }
            }

            function handle_HOTKEY(key) {
                var i = 0;

                for (i; i < hotkeys.length; i += 1) {
                    if (String.fromCharCode(key).toLowerCase() == hotkeys[i]) {
                        runTalkPoint(i);
                    }
                }
            }

            /**
             * handle key down for next/previous
             */
            function handle_document_KEY_DOWN(e) {
                switch (e.keyCode) {
                case 39:
                case 34:
                    UserEvent.NEXT.dispatch();
                    break;
                case 37:
                case 33:
                    UserEvent.PREVIOUS.dispatch();
                    break;
                case 9: //TAB
                    //toggle mode
                    VarsModel.PRESENTATION = VarsModel.PRESENTATION === true ? false : true;
                    break;
                default:
                    UserEvent.HOTKEY.dispatch(e.keyCode);
                    break;
                }
            }

    //event triggers
            
            function setupStateManager() {
                History = window.History; // Note: We are using a capital H instead of a lower h
                History.Adapter.bind(window, 'statechange', function (e) {
                    StateEvent.STATE_CHANGE.dispatch(e);
                });
                StateEvent.STATE_CHANGE.add(handle_STATE_CHANGE);
                //StateEvent.SECTION_READY.add(handle_SECTION_READY);
                StateEvent.SECTION_ANIM_IN_COMPLETE.add(handle_ANIM_IN_COMPLETE);
                StateEvent.SECTION_DESTROY.add(handle_SECTION_DESTROY);
            }

            /**
             * update animations
             */
            function update() {
                requestAnimationFrame(update);
                TWEEN.update();
                view.update();
            }

            /**
             * setup initial state based on uri
             * TODO:: uri may need to be fixed if using more complex uri structure
             */
            function setupInitialState() {
                var initialState,
                    uri = window.location.pathname;

                uri = uri !== '/' ? uri.replace('/', '') : uri; //replace /
                uri = uri.indexOf('#') === 0 ? uri.substr(1, uri.length) : uri;  //replace #
                initialState = model.getStateByURL(uri);

                if (typeof(initialState) !== 'undefined' && initialState.id > 0) {
                    model.setCurrentState(initialState.id);
                    StateEvent.SCENE_LOAD_PROGRESS.add(handle_SCENERY_LOAD_PROGRESS);
                    StateEvent.SCENE_LOADED.add(handle_SCENERY_LOADED);
                    AssetModel.loadScene();
                } else {
                    model.setCurrentState(0);
                    view.gotoSection(0);
                }
            }

//public
            instance.init = function () {
                $document = $(document);
                $window = $(window);
                $soundbtn = $('#sound-btn');

                view.setViewList(model.getViewList());
                view.init();

                //set up events
                $document.bind('keydown', function (e) {
                    UserEvent.KEY_DOWN.dispatch(e);
                });

                $document.bind('keyup', function (e) {
                    UserEvent.KEY_UP.dispatch(e);
                });

                $('#key-right').bind('click', function () {
                    UserEvent.NEXT.dispatch();
                });

                $('#key-left').bind('click', function () {
                    UserEvent.PREVIOUS.dispatch();
                });

                $('#info-btn').bind('click', function () {
                    UserEvent.INFO_CLICK.dispatch();
                });

                $soundbtn.bind('click', function () {
                    UserEvent.SOUND_CLICK.dispatch();
                });

                $('#vignette').bind('click', function () {
                    view.hidePanel();
                });

                $('#warning').bind('click', function () {
                    //$(this).fadeOut();
                    view.showMissingFeaturesAlert();
                });

                $('.btn').bind('click', function (e) {
                    Audio.playSFX('button_hover');
                });

                $('.btn').bind('mouseover', function (e) {
                    Audio.playSFX('button_click');
                });


                $document.bind('mousemove', function (e) {
                    UserEvent.MOUSE_MOVE.dispatch(e);    
                });

                $window.resize(function () {
                    UserEvent.RESIZE.dispatch();
                });
                
                UserEvent.NAV_CLICK.add(handle_NAV_CLICK);
                UserEvent.INFO_CLICK.add(handle_INFO_CLICK);
                UserEvent.SOUND_CLICK.add(handle_SOUND_CLICK);
                UserEvent.KEY_DOWN.add(handle_document_KEY_DOWN);
                UserEvent.NEXT.add(handle_NEXT);
                UserEvent.PREVIOUS.add(handle_PREVIOUS);
                UserEvent.SLIDE_IN.add(handle_SLIDE_IN);
                UserEvent.SLIDES_OUT.add(handle_SLIDES_OUT);
                UserEvent.HOTKEY.add(handle_HOTKEY);
                
                if (VarsModel.PRESENTATION === true) {
                    StateEvent.WAIT_FOR_INTERACTION.add(handle_WAIT_FOR_INTERACTION);
                }

                setupStateManager();
                setupInitialState();

                if (VarsModel.ADOBE_BUILD !== true) {
                    view.showMissingFeaturesAlert();
                }

                update();
            };

            instance.init();
		};

		return Controller;
    });
