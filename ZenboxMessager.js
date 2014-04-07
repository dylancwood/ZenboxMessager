(function(ZenboxMessager, undefined) {
    'use strict';
    /**
     *
     * ZenboxMessager object to send messages to Zendesk popup iframe
     * in order to pre-populate fields about user and application state
     * Requires that the Zendesk Feekback tab also have a message listener
     * set up. This is done by injecting javascript into the custom css
     * input in the Feedback Tab configuration.
     */

    /**
     * Add an event that will trigger this to nag the zendesk window
     * This should be assigned to all elements and events that result
     * in the Zendesk Feedback Window being opened.
     * @param {object} element The HTML element to listen to
     * @param {string} eventType The name of the event to listen for
     * (e.g. "click")
     * @return {ZenboxMessager}
     */
    ZenboxMessager.addMessageEvent = function(element, eventType) {
        var _this = this;
        element.addEventListener(eventType, function() {
            _this.setMessageFromDataPointer().nag();
        });

        return this;
    };
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
        this.recipientWindow = (
            window.frames.zenbox_body.contentWindow ||
            window.frames.zenbox_body.window ||
            window.frames.zenbox_body
        );
        this.message = '';
        this.messageReceived = false;
        this.zendeskURL = zendeskURL;
        this.dataPointer = dataPointer;
        this.listenForReceivedSignal();

        return this;
    };

    /**
     * Set up listener to mark message read when Zendesk window posts message
     * @return {ZenboxMessager}
     */
    ZenboxMessager.listenForReceivedSignal = function() {
        // This looks more complicated than it is in order to support older 
        // browsers
        // Create IE + others compatible event handler
        var _this = this;
        var eventMethod =
            window.addEventListener ? "addEventListener" : "attachEvent";
        var eventer = window[eventMethod];
        var messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";

        // Listen to message from child window
        eventer(messageEvent, function(e) {
            if (e.source === _this.recipientWindow &&
                e.origin === _this.zendeskURL &&
                e.data === 'received') {
                _this.markAsReceived();
            } /*else {
                // this is probably not error-worthy, but we don't want to
                // take any action on a message from an unknown frame
                // uncommenting the line below may be useful for debugging
                // throw new Error ("Unknown message received: " + e.data);
            }*/
        }, false);
    };

    /**
     * Mark that the message has been received: will stop the nag function
     * @return {ZenboxMessager}
     */
    ZenboxMessager.markAsReceived = function() {
        this.messageReceived = true;

        return this;
    };

    /**
     *
     * Public method to continuously send messages in ~1/4 second intervals
     * until the recipientWindow replies with a 'received' message.
     * @return {ZenboxMessager}
     */
    ZenboxMessager.nag = function() {
        var _this = this;
        if (!this.messageReceived) {
            window.setTimeout(function() {
                _this.nag.apply(_this);
            }, 250);
            this.send(this.recipientWindow, this.message, this.zendeskURL);
        }

        return this;
    };

    /**
     * Protected static function to send a message to the zendesk iframe
     */
    ZenboxMessager.send = function() {
        this.recipientWindow.postMessage(this.message, this.zendeskURL);
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
