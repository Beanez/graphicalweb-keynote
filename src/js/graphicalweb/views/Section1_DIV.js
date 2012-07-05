define(['graphicalweb/events/StateEvent',
        'graphicalweb/controllers/CameraController'],

	function (StateEvent, Camera) {
		
		var Section1_DIV = function () {
			var instance = this,
                stateId = 1,
                $blockquotes,
                $cover,
                $view;

            instance.phaselength = 0;
            instance.phase = 0;

//private
            
            function handle_intro_CLICK(e) {
                instance.stop();
            }

            function update() {

            }
            
//public
            instance.init = function () {
                $view = $('#section2');
                $blockquotes = $view.find('blockquote');

                StateEvent.SECTION_READY.dispatch(stateId);

                instance.phase = 0;
                instance.phaselength = $blockquotes.length;

                Camera.setPosition(0, -768, 0); //SET camera position
            };

            instance.start = function () {
                $cover = $('#cover');

                if ($cover.is(':visible')) {
                    $cover.fadeOut();
                }
            };

            instance.next = function () {

                //TODO:: sequence through
                $blockquotes.fadeOut(function () {
                    $($blockquotes[instance.phase]).fadeIn();
                });
                instance.phase += 1;
            };

            instance.stop = function () {
                $blockquotes.fadeOut();
                instance.destroy();
            };

            instance.destroy = function () {
                StateEvent.SECTION_DESTROY.dispatch();
            };
		};

		return new Section1_DIV();
    });
