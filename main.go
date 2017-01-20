package main

import (
	"log"
	"net/http"
	"math/rand"
	"time"
	"github.com/gorilla/websocket"
)

var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")

func randSeq(n int) string {
    b := make([]rune, n)
    for i := range b {
        b[i] = letters[rand.Intn(len(letters))]
    }
    return string(b)
}

var clients = make(map[string]*websocket.Conn) // connected clients
var broadcast = make(chan Message)           // broadcast channel

// Configure the upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Define our message object
type Message struct {
	ClientId string `json:"-"`
	Command string `json:"cmd"`
	Username string `json:"username,omitempty"`
	Avatar string `json:"avatar,omitempty"`
	Message  string `json:"message,omitempty"`
	Error string `json:"error,omitempty"`
}

func main() {
	rand.Seed(time.Now().UnixNano())

	// Create a simple file server
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	// Configure websocket route
	http.HandleFunc("/ws", handleConnections)

	// Start listening for incoming chat messages
	go handleMessages()

	// Start the server on localhost port 8000 and log any errors
	log.Println("http server started on :8000")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a websocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	// Make sure we close the connection when the function returns
	defer ws.Close()

	// Register our new client
	id := randSeq(6)

	clients[id] = ws

	for {
		var msg Message

		// Read in a new message as JSON and map it to a Message object
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("error: %v", err)
			delete(clients, id)
			break
		}

		msg.ClientId = id

		// Send the newly received message to the broadcast channel
		broadcast <- msg
	}
}

func handleMessages() {
	for {
		// Grab the next message from the broadcast channel
		msg := <-broadcast

		switch msg.Command {
			case "C_JOIN":
				// Send accept back to the client
				newMsg := Message {
					ClientId: msg.ClientId,
					Command: "S_ACCEPT" }

				sendMessage(newMsg)

				// Notify another clients
				newMsg = Message {
					Username: msg.Username,
					Command: "S_NEWCOMER" }

				for id, _ := range clients {
					if id != msg.ClientId {
						newMsg.ClientId = id
						sendMessage(newMsg)
					}
				}

			case "C_MSG":
				// Send it out to every client that is currently connected
				for id, _ := range clients {
					msg.ClientId = id
					sendMessage(msg)
				}

			default:
		}
		
	}
}

func  sendMessage(msg Message) {
	client, ok := clients[msg.ClientId]

	if !ok { return }

	err := client.WriteJSON(msg)

	if err != nil {
		log.Printf("error: %v", err)
		client.Close()
		delete(clients, msg.ClientId)
	}
}