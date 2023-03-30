import { createLibp2p } from 'libp2p'
import { webRTCDirect } from '@libp2p/webrtc-direct'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import wrtc from 'wrtc'
import { webSockets } from '@libp2p/websockets'
import { webRTCStar } from '@libp2p/webrtc-star'
import { tcp } from '@libp2p/tcp'

import { circuitRelayTransport, circuitRelayServer } from 'libp2p/circuit-relay'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { bootstrap } from '@libp2p/bootstrap'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'

import getPort from 'get-port';

const decodeMessage = msg => {
  try {
    if (typeof msg === 'object') {
      return new TextDecoder().decode(msg)
    }
    else return new Error('msg is not a string or object')
  } catch (error) {
    return error
  }
}

const wrtcStar = webRTCStar()

  ; (async () => {
    // hardcoded peer id to avoid copy-pasting of listener's peer id into the dialer's bootstrap list
    // generated with cmd `peer-id --type=ed25519`
    const bootstrapPeerID = "12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m"
    const bootstrapNode = [`/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/${bootstrapPeerID}`]
    let peerID = await createEd25519PeerId()
    let port = await getPort()

    const libp2p = await createLibp2p({
      peerId: peerID,
      addresses: {
        listen: [
          `/ip4/127.0.0.1/tcp/${port}/http/p2p-webrtc-direct`,
          '/ip4/0.0.0.0/tcp/0',
          `/ip4/127.0.0.1/tcp/${port}/ws`,
          // "/dns4/localhost/tcp/24642/ws/p2p-webrtc-star/"
        ]
      },
      pubsub: gossipsub({ allowPublishToZeroPeers: true, emitSelf: false }),
      transports: [webRTCDirect({ wrtc }), webSockets(), tcp(), wrtcStar.transport],
      streamMuxers: [mplex()],
      connectionEncryption: [noise()],
      peerDiscovery: [
        wrtcStar.discovery,
        pubsubPeerDiscovery({interval: 1000}),
        bootstrap({ list: bootstrapNode })
      ],
    })

    const log = console.log

    const receivePeers = (remote_peers) => {
      remote_peers.forEach(peer => {
        if (peer.id !== peerID.toString()) libp2p.dial(peer.id).catch(err => { log(`Could not dial ${peer.id}`) })
      })
      log(`Remote Peers: ${remote_peers.join(',')}`)
    }

    // https://github.com/libp2p/js-libp2p/tree/master/examples/pubsub
    let last_msg = "{data: 'no messages yet'}"
    libp2p.pubsub.addEventListener('message', evt => {
      let msg = decodeMessage(evt.detail.data)
      if (evt.detail.topic === 'msg') {
        // log(`Message: ${msg}`)
        last_msg = msg
        log(msg)
      }
    })
    libp2p.pubsub.subscribe(('msg'))
    libp2p.pubsub.subscribe(('peers'))


    // Listen for new peers
    libp2p.addEventListener('peer:discovery', (evt) => {
      // log(`Found peer ${evt.detail.id.toString()}`)
      // dial them when we discover them
      libp2p.dial(evt.detail.id).catch(err => {
        log(`Could not dial ${evt.detail.id}`, err)
      })
    })

    // Listen for new connections to peers
    libp2p.connectionManager.addEventListener('peer:connect', (evt) => {
      log(`Connected to ${evt.detail.remotePeer.toString()}`)
    })

    // Listen for peers disconnecting
    libp2p.connectionManager.addEventListener('peer:disconnect', (evt) => {
      log(`Disconnected from ${evt.detail.remotePeer.toString()}`)
    })

    setInterval(async () => {
      try {
        console.clear()
        let peers = await libp2p.peerStore.all()
        console.log('Our peer id:', libp2p.peerId.toString())
        console.log(`The node now has ${peers.length} peers.`)
        console.log('Peers:', peers.map(p => p.id ? p.id : Object.keys(p)))
        console.log('Last message:', last_msg)


      } catch (err) {
        console.log('An error occurred trying to check our peers:', err)
      }
    }, 2000)

  })()
