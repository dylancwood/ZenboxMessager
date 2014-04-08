(function(ZenboxMessager, undefined) {
    'use strict';
    /**
     * Messager prototype sets up a messager that can send messages to a specific
     * window and origin, and receive messages from the same window and origin.
     * This little prototype uses the classic CS terms of Alice and Bob. In this
     * case, Bob is the recipient of the message, and Alice is the messaging 
     * application/client.
     */

    /*
     * Messager Prototype constructor
     * @param {object|Window} bobsWindow The window or frame to send messages to
     * @param {string} bobsOrigin The origin (src domain) of bobsWindow.
     */
    var Messager = function(bobsWindow, bobsOrigin){
        var alice = this;
        this.bobsWindow = bobsWindow;
        this.bobsOrigin = bobsOrigin;
    };

    /**
     * Set up listener to mark message read when Zendesk window posts message
     * @param {function} callbackFn A callback to be executed when a message is
     * received
     * @return {Messager}
     */
    Messager.prototype.listen = function(callbackFn) {
        // This looks more complicated than it is in order to support older 
        // browsers
        // Create IE + others compatible event handler
        var alice = this;
        var eventMethod =
            window.addEventListener ? "addEventListener" : "attachEvent";
        var eventer = window[eventMethod];
        var messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";

        // Listen to message from bob
        eventer(messageEvent, function(e) {
            if (e.source === alice.bobsWindow &&
                e.origin === alice.bobsOrigin) {
                callbackFn(e);
            }
        }, false);
        
        return alice;
    };

    /**
     * Protected static function to send a message to the zendesk iframe
     * @param {string} message The message to be sent to Bob.
     */
    Messager.prototype.send = function(message) {
        return this.bobsWindow.postMessage(message, this.bobsOrigin);
    };

    /**
     *
     * ZenboxMessager object to send messages to Zendesk popup iframe
     * in order to pre-populate fields about user and application state
     * Requires that the Zendesk Feekback tab also have a message listener
     * set up. This is done by injecting javascript into the custom css
     * input in the Feedback Tab configuration.
     */

    /**
     * Initialize object with information about zendesk and app
     * @param {string} zendeskURL The URL of the Zendesk sub-site for which
     * the feedback tab has been generated (e.g. https://foo.zendesk.com)
     * @param {object} dataPointer An object that will be maintained outside
     * of this script that will contain all of the necessary data to be
     * passed to zendesk (e.g {sessionID: 1234, specialVar: 321} )
     * @return {ZenboxMessager}
     */
    ZenboxMessager.init = function(zendeskURL, dataPointer) {
        var messager;
        this.recipientWindow = (
            window.frames.zenbox_body.contentWindow ||
            window.frames.zenbox_body.window ||
            window.frames.zenbox_body
        );
        this.messager = new Messager(this.recipientWindow, zendeskURL);
        this.message = '';
        this.messageReceived = false;
        this.zendeskURL = zendeskURL;
        this.dataPointer = dataPointer;
        this.listenForReadySignal();
        this.listenForReceivedSignal();

        return this;
    };

    /**
     * Set up listener to mark message read when Zendesk window posts message
     * @return {ZenboxMessager}
     */
    ZenboxMessager.listenForReceivedSignal = function() {
        var _this = this;
        this.messager.listen(function stopNagWhenReceived (messageEvent) {
            if(messageEvent.data === 'ZenboxReceived') {
                _this.markAsReceived();
            }
        });
       
        return this;
    };

    /**
     * Set up listener to send data when Zendesk Iframe is ready
     * @return {ZenboxMessager}
     */
    ZenboxMessager.listenForReadySignal = function() {
        var _this = this;
        this.messager.listen(function sendWhenReady (messageEvent) {
            if(messageEvent.data === 'ZenboxReady') {
                _this.setMessageFromDataPointer();
                _this.messager.send(_this.message);
            }
        });
        
        return this;
    };

    /**
     * Mark that the message has been received: will stop the nag function
     * @return {ZenboxMessager}
     */
    ZenboxMessager.markAsReceived = function(response) {
        this.messageReceived = true;

        return this;
    };

    /**
     *
     * Public method to continuously send messages in ~1/4 second intervals
     * until the recipientWindow replies with a 'received' message.
     * It may not be necessary to manually nag the recipient Window: It appears
     * that the postMessage API handles this by persistently sending to a valid
     * recipient window until a response is head.
     * @return {ZenboxMessager}
     */
    ZenboxMessager.nag = function() {
        var _this = this;
        if (!this.messageReceived) {
            window.setTimeout(function() {
                _this.nag.apply(_this);
            }, 250);
            this.messager.send(this.message);
        }

        return this;
    };

    /**
     * Set a new message to be sent. Also resets the messageReceived var
     * @param {string} msg The data to be sent to the zendesk iframe
     * @return {ZenboxMessager}
     */
    ZenboxMessager.setMessage = function(msg) {
        //reset variable tracking whether the message was received
        this.unmarkAsReceived();
        this.message = msg;

        return this;
    };

    /**
     * Set a new message to be sent from a raw object
     * @param {object} obj The data to be sent to the zendesk iframe
     * @return {ZenboxMessager}
     */
    ZenboxMessager.setMessageFromDataPointer = function() {
        var key, obj = this.dataPointer,
            encodedObj = {};
        //url encode each value
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                encodedObj[key] = encodeURIComponent(obj[key]);
            }
        }
        this.setMessage(JSON.stringify(encodedObj));

        return this;
    };

    /**
     * Generate string rerpresntation of object
     * @return {string}
     */
    ZenboxMessager.toString = function() {
        return '[object ZenboxMessager]';
    };


    /**
     * Unmark that the message has been received: will allow nag to resume
     * @return {ZenboxMessager}
     */
    ZenboxMessager.unmarkAsReceived = function() {
        this.messageReceived = false;
    };
})(window.ZenboxMessager = window.ZenboxMessager || {});

