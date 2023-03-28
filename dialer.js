import { createLibp2p } from 'libp2p'
import * as IPFS from 'ipfs-core'
import { webRTCDirect } from '@libp2p/webrtc-direct'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { bootstrap } from '@libp2p/bootstrap'
import { tcp } from '@libp2p/tcp'
import { webRTCStar } from '@libp2p/webrtc-star'
import { webSockets } from '@libp2p/websockets'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { delegatedPeerRouting } from '@libp2p/delegated-peer-routing'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { create as createIpfsHttpClient } from 'ipfs-http-client'

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

document.addEventListener('DOMContentLoaded', async () => {
  const peers = []
  const wrtcStar = webRTCStar()
  // use the same peer id as in `listener.js` to avoid copy-pasting of listener's peer id into `peerDiscovery`
  const hardcodedPeerId = '12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m'
  const bootstrapNode = [`/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/${hardcodedPeerId}`]

  const libp2pBundle = async () => await createLibp2p({
    transports: [webSockets(), webRTCDirect(), wrtcStar.transport],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
    pubsub: gossipsub({ allowPublishToZeroPeers: true }),
    peerDiscovery: [
      wrtcStar.discovery,
      bootstrap({ list: bootstrapNode})
    ],
  })

  const ipfs = await IPFS.create({
    repo: "dailer" + Math.random(),
    libp2p: libp2pBundle,
    config: {
      Addresses: {
        Delegates: [],
        Bootstrap: []
      },
      Bootstrap: []
    },
    
  })
  const status = document.getElementById('status')
  const output = document.getElementById('output')

  output.textContent = ''

  function log(txt) {
    console.info(txt)
    output.textContent = `${txt.trim()}`
  }

  log("ipfs is ready")

  const config = await ipfs.config.getAll()
  console.log(config)

  log("ipfs is ready "+config.Identity.PeerID)

  // Lets log out the number of peers we have every 2 seconds

  ipfs.pubsub.subscribe('msg', (msg) => { 
    log(decodeMessage(msg))
  })

  ipfs.pubsub.subscribe('peers', msg => {
    try {
        let remote_peers = JSON.parse(decodeMessage(msg))
        remote_peers.forEach( remote_peer => {
          peers.find(peer => peer.peer === remote_peer.peer) || peers.push(remote_peer)
          let address= `${peer.addr}/http/p2p-webrtc-direct/p2p/${peer.peer}`
          // ipfs.swarm.connect(address).catch(err => {
          //   console.log(`Could not dial ${address}`, err)
          // })

          // remove any remote peers that are not in peers
          peers.forEach( (peer, index) => {
            if (remote_peers.find(remote_peer => remote_peer.peer === peer.peer) === undefined) {
              peers.splice(index, 1)
            }
        })
      })
    } catch (error) {
      console.log(msg)
    }

  })

  setInterval(async () => {
    try {
      const peers = await ipfs.swarm.peers()
      log(`The node now has ${peers.length} peers.`)

      
      ipfs.pubsub.publish('msg' , new TextEncoder().encode("hello from "+config.Identity.PeerID))

    } catch (err) {
      log('An error occurred trying to check our peers:', err)
    }
  }, 2000)
})
