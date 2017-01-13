new Vue({
    el: '#app',

    data: {
        ws: null, // Our websocket
        newMsg: '', // Holds new messages to be sent to the server
        chatContent: '', // A running list of chat messages displayed on the screen
        username: null, // Our username
        joined: false // True if email and username have been filled in
    },

    created: function() {
        
    },

    methods: {
        send: function () {
            if (this.newMsg != '') {
                this.ws.send(
                    JSON.stringify({
                        username: this.username,
                        message: $('<p>').html(this.newMsg).text() // Strip out html
                    }
                ));
                this.newMsg = ''; // Reset newMsg
            }
        },

        join: function () {
            if (!this.username) {
                Materialize.toast('You must choose a username', 2000);
                return
            }
            this.username = $('<p>').html(this.username).text();

            var self = this;
            this.ws = new WebSocket('ws://' + window.location.host + '/ws');

            this.ws.onopen = function() {
                console.log('connected');
                self.joined = true;
            };

            this.ws.onclose = function(evt) {
                if (evt.code == 3001) {
                    console.log('ws closed');
                    self.ws = null;
                } else {
                    self.ws = null;
                    console.log('ws connection error');
                }
            };

            this.ws.onmessage = function(msg) {
                var msg = JSON.parse(msg.data);
                self.chatContent += '<div class="chat-line">'
                    + '<img src="http://image.flaticon.com/icons/svg/149/149071.svg">' // Avatar
                    + '<span class="chat-name">' + msg.username + ':</span>'
                    + '<span class="chat-content">' + emojione.toImage(msg.message) + '</span>'
                    + '</div>';

                var element = document.getElementById('chat-messages');
                element.scrollTop = element.scrollHeight; // Auto scroll to the bottom
            };

            this.ws.onerror = function() {
                console.log('error');
            };
        }
    },

    watch: {
        username: function (newQuestion) {
            this.username = this.username.replace(/[^a-zA-Z0-9]/g, "").substring(0, 30);
        }
    }
});