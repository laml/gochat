var STATUS = {
    WAIT: 0,
    CONNECTING: 1,
    CONNECTED: 3,
    JOINED: 2
}

new Vue({
    el: '#app',

    data: {
        ws: null, // websocket
        newMsg: '', // Holds new messages to be sent to the server
        chatContent: '', // A running list of chat messages displayed on the screen
        username: null, // Nickname

        status: STATUS.WAIT,

        avatar: 'http://image.flaticon.com/icons/svg/149/149071.svg' // default avatar
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

                document.getElementById('chat-textbox').focus();
            }
        },

        join: function () {
            if (this.status != STATUS.WAIT) return;

            if (!this.username) {
                Materialize.toast('You must choose a username', 2000);
                return
            }
            this.username = $('<p>').html(this.username).text();

            var self = this;

            this.status = STATUS.CONNECTING;

            var fakeDelay = 2000;

            this.ws = new WebSocket('ws://' + window.location.host + '/ws');

            this.ws.onopen = function() {
                console.log('connected');

                setTimeout(function() {
                    self.status = STATUS.CONNECTED;
                }, fakeDelay);

                setTimeout(function() {
                    self.status = STATUS.JOINED;
                }, fakeDelay + 1000);

                setTimeout(function() {
                    document.getElementById('chat-textbox').focus();
                }, fakeDelay + 1500);
            };

            this.ws.onclose = function(evt) {
                if (evt.code == 3001) {
                    console.log('ws closed');
                    self.ws = null;
                } else {
                    self.ws = null;
                    console.log('ws connection error');
                }

                this.status = STATUS.WAIT;
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

                this.status = STATUS.WAIT;
            };
        },

        setAvatar: function(e) {
            var files = e.target.files || e.dataTransfer.files;
            if (!files.length)
                return;

            var reader = new FileReader();
            var self = this;

            reader.onload = function(e) {
                // Create a canvas to resize image
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');

                canvas.width = 100;
                canvas.height = 100;

                var image = new Image();
                image.src = e.target.result;
                image.onload = function() {
                    ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
                    self.avatar = canvas.toDataURL();
                }
            };
            reader.readAsDataURL(files[0]);
        },

        triggerUpload: function(e) {
            $(e.target).siblings('input:file').click();
        }
    },

    computed: {
        wait: function () {
            return this.status == STATUS.WAIT;
        },
        connecting: function () {
            return this.status == STATUS.CONNECTING;
        },
        connected: function () {
            return this.status == STATUS.CONNECTED;
        },
        joined: function () {
            return this.status == STATUS.JOINED;
        }
    },

    watch: {
        username: function (newQuestion) {
            this.username = this.username.replace(/[^a-zA-Z0-9]/g, "").substring(0, 30);
        }
    }
});