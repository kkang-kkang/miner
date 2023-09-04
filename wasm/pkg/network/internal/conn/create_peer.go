package conn

import "github.com/pion/webrtc/v3"

func CreatePeer() (*webrtc.PeerConnection, error) {

	var (
		err   error
		offer webrtc.SessionDescription
		conn  *webrtc.PeerConnection
	)

	conn, err = webrtc.NewPeerConnection(webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{""}},
		}})

	if err != nil {
		return nil, err
	}

	if offer, err = conn.CreateOffer(nil); err != nil {
		return nil, err
	}

	if err = conn.SetLocalDescription(offer); err != nil {
		return nil, err
	}

	return conn, nil
}
