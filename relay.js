import { createLibp2p } from 'libp2p'
import * as IPFS from 'ipfs-core'
import { webRTCDirect } from '@libp2p/webrtc-direct'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import wrtc from 'wrtc'
import { webSockets } from '@libp2p/websockets'
import { webRTCStar } from '@libp2p/webrtc-star'
import { circuitRelayTransport, circuitRelayServer } from 'libp2p/circuit-relay'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { bootstrap } from '@libp2p/bootstrap'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'

const decodeMessage = msg => {
  try {
    if (typeof msg === 'object') {
      return new TextDecoder().decode(msg.data)
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
    const hardcodedPeerId = "12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m"
    const bootstrapNode = [`/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/${hardcodedPeerId}`]
    let peerID = await createEd25519PeerId()

    const libp2pBundle = async () => await createLibp2p({
      peerId: peerID,
      addresses: {
        listen: [
          '/ip4/127.0.0.1/tcp/10001/http/p2p-webrtc-direct',
          '/ip4/0.0.0.0/tcp/0',
          '/ip4/127.0.0.1/tcp/10000/ws'
        ]
      },
      pubsub: gossipsub({ allowPublishToZeroPeers: true, emitSelf: false }),
      transports: [webRTCDirect({ wrtc }), webSockets(), circuitRelayTransport()],
      streamMuxers: [mplex()],
      connectionEncryption: [noise()],
      peerDiscovery: [
        wrtcStar.discovery,
        bootstrap({ list: bootstrapNode })
      ],
    })

    const ipfs = await IPFS.create({
      repo: "relay" + Math.random(),
      libp2p: libp2pBundle,
      config: {
        Addresses: {
          Delegates: [],
          Bootstrap: []
        },
        Bootstrap: []
      },
    })
    let last_msg = "{data: 'no messages yet'}"
    // re-broadcast messages
    ipfs.pubsub.subscribe('msg', (msg) => {
      last_msg = JSON.parse(decodeMessage(msg))
      // ipfs.pubsub.publish('msg', msg)
    })



    // Lets log out the number of peers we have every 2 seconds
    setInterval(async () => {
      try {
        console.clear()
        const peers = await ipfs.swarm.peers()
        const config = await ipfs.config.getAll()
        console.log("ipfs is ready " + peerID.toString())
        console.log(`The node now has ${peers.length} peers.`)
        console.log('Last message:', last_msg)
        console.log('Peers:', peers)

        ipfs.pubsub.publish('peers', new TextEncoder().encode(JSON.stringify(peers)))

      } catch (err) {
        console.log('An error occurred trying to check our peers:', err)
      }
    }, 2000)
  })()
