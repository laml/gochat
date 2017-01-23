var STATUS = {
    WAIT: 0,
    CONNECTING: 1,
    CONNECTED: 3,
    JOINED: 2
}

var app = new Vue({
    el: '#app',

    data: {
        ws: null, // websocket
        newMsg: '', // Holds new messages to be sent to the server
        username: sessionStorage.username, // Nickname

        status: STATUS.WAIT,

        avatar: sessionStorage.avatar || 'http://image.flaticon.com/icons/svg/149/149071.svg', // default avatar

        messages: []
    },

    created: function() {
    },

    methods: {
        send: function () {
            if (this.newMsg != '') {
                this.ws.send(
                    JSON.stringify({
                        cmd: 'C_MSG',
                        username: this.username,
                        avatar: this.avatar,
                        message: $('<p>').html(this.newMsg).text() // Strip out html
                    }
                ));
                this.newMsg = ''; // Reset newMsg

                document.getElementById('chat-textbox').focus();
            }
        },

        connect: function () {
            if (this.status != STATUS.WAIT) return;

            if (!this.username) {
                Materialize.toast('You must choose a username', 2000);
                return
            }
            this.username = sessionStorage.username = $('<p>').html(this.username).text();

            var self = this;

            this.status = STATUS.CONNECTING;

            // already connected to websocket
            if (this.ws) {
                this.join();
                return
            }

            this.ws = new WebSocket('ws://' + window.location.host + '/ws');

            this.ws.onopen = function() {
                self.join();
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

                var fakeDelay = 2000;

                switch(msg.cmd) {
                    case 'S_REFUSE':
                        Materialize.toast(msg.error, 2000);
                        break;

                    case 'S_ACCEPT':
                        setTimeout(function() {
                            self.status = STATUS.CONNECTED;
                        }, fakeDelay);

                        setTimeout(function() {
                            self.status = STATUS.JOINED;

                        }, fakeDelay + 1000);

                        setTimeout(function() {
                            document.getElementById('chat-textbox').focus();
                        }, fakeDelay + 1500);
                        break;

                    case 'S_NEWCOMER':
                        if (msg.username != self.username) {
                            Materialize.toast(msg.username + ' has joined', 2000);
                        }
                        break;

                    case 'C_MSG':
                        msg.next = self.messages.length > 0 && self.messages[self.messages.length - 1].username == msg.username;
                        self.messages.push(msg);

                        setTimeout(function() {
                            var element = document.getElementById('chat-messages');
                            element.scrollTop = element.scrollHeight; // Auto scroll to the bottom
                        }, 100);
                        break;
                }
            };

            this.ws.onerror = function() {
                console.log('error');

                this.status = STATUS.WAIT;
            };
        },

        join: function() {
            // websocket opened, asked for joining
            this.ws.send(
                JSON.stringify({
                    cmd: 'C_JOIN',
                    username: this.username,
                    avatar: this.avatar
                }
            ));
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
                    self.avatar = sessionStorage.avatar = canvas.toDataURL();
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
            this.username = this.username.replace(/[^a-zA-Z0-9_]/g, "").substring(0, 30);
        }
    }
});