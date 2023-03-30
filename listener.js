import { createLibp2p } from 'libp2p'
import { webRTCDirect } from '@libp2p/webrtc-direct'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { tcp } from '@libp2p/tcp'
import { createFromJSON } from '@libp2p/peer-id-factory'
import wrtc from 'wrtc'
import { webSockets } from '@libp2p/websockets'
import { webRTCStar } from '@libp2p/webrtc-star'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'

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
    const hardcodedPeerId = await createFromJSON({
      "id": "12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m",
      "privKey": "CAESQAG6Ld7ev6nnD0FKPs033/j0eQpjWilhxnzJ2CCTqT0+LfcWoI2Vr+zdc1vwk7XAVdyoCa2nwUR3RJebPWsF1/I=",
      "pubKey": "CAESIC33FqCNla/s3XNb8JO1wFXcqAmtp8FEd0SXmz1rBdfy"
    })

    const libp2p = await createLibp2p({
      peerId: hardcodedPeerId,
      addresses: {
        listen: [
          '/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct',
          '/ip4/0.0.0.0/tcp/0',
          '/ip4/127.0.0.1/tcp/9099/ws'
        ]
      },
      pubsub: gossipsub({ allowPublishToZeroPeers: true , emitSelf: false}),
      transports: [webRTCDirect({ wrtc }),webSockets(), tcp(), wrtcStar.transport],
      streamMuxers: [mplex()],
      connectionEncryption: [noise()],
      peerDiscovery: [
        wrtcStar.discovery,
        pubsubPeerDiscovery({interval: 1000})
      ],
    })

    const log = console.log


    let last_msg = "{data: 'no messages yet'}"
    libp2p.pubsub.addEventListener('message', evt => {
      let msg = decodeMessage(evt.detail.data)
      if (evt.detail.topic === 'msg') {
        last_msg = msg
      }
    })
    libp2p.pubsub.subscribe(('msg'))

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
        console.log(`The node now has ${peers.length} peers.`)
        console.log('Peers:', peers.map(p => p.id ? p.id : Object.keys(p)))
        console.log('Last message:', last_msg)


      } catch (err) {
        console.log('An error occurred trying to check our peers:', err)
      }
    }, 2000)
  })()
