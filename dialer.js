import { createLibp2p } from 'libp2p'
import { webRTCDirect } from '@libp2p/webrtc-direct'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { bootstrap } from '@libp2p/bootstrap'
import { webRTCStar } from '@libp2p/webrtc-star'
import { webSockets } from '@libp2p/websockets'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import * as IPFS from 'ipfs-core'
import { decodeMessage } from './utils.js'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'


// https://github.com/libp2p/js-libp2p/blob/master/examples/libp2p-in-the-browser/index.js


document.addEventListener('DOMContentLoaded', async () => {
  const wrtcStar = webRTCStar()
  // use the same peer id as in `listener.js` to avoid copy-pasting of listener's peer id into `peerDiscovery`
  const hardcodedPeerId = '12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m'
  const bootstrapNode = [`/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/${hardcodedPeerId}`]

  let peerID = await createEd25519PeerId()

  const libp2pBundle = async () => await createLibp2p({
    peerId: peerID,
    addresses: {
      listen: [
        "/dns4/localhost/tcp/24642/ws/p2p-webrtc-star/",
      ],
    },
    transports: [webSockets(), webRTCDirect(), wrtcStar.transport],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
    pubsub: gossipsub({ allowPublishToZeroPeers: true }),
    peerDiscovery: [
      wrtcStar.discovery,
      bootstrap({ list: bootstrapNode }),
      pubsubPeerDiscovery({ interval: 1000 })
    ],
  })


  const ipfs = await IPFS.create({
    repo: "dailer" + Math.random(),
    libp2p: libp2pBundle,
    config: {Addresses: {Delegates: [],Bootstrap: []},Bootstrap: []},
  })
          
  const status = document.getElementById('status')
  const peerlist = document.getElementById('peerlist')
  const output = document.getElementById('output')
  const message = document.getElementById('message')
  status.textContent = ''
  output.textContent = ''

  function updateStatus(txt) {
    console.info(txt)
    status.textContent = `${txt.trim()}`
  }

  function updatePeerList(txt) {
    peerlist.textContent = `${txt.trim()}`
  }
  function updateMessage(txt) {
    message.textContent = `${txt.trim()}`
  }

  function log(txt) {
    console.info(txt)
    output.textContent += `${txt.trim()} \n`
  }

  updateStatus("ipfs is ready " + peerID.toString())
  // Lets log out the number of peers we have every 2 seconds

  let said_hi = 0

  ipfs.pubsub.subscribe('msg', evt => {
    let msg = decodeMessage(evt.data)
    updateMessage(msg)
  })

  setInterval(async () => {
    try {
      const peers = await ipfs.swarm.addrs()
      updatePeerList(`Peers: ${peers.map(peer => peer.id).join(', \n')}`)

      said_hi++
      let msg = new TextEncoder().encode(JSON.stringify({ signer: peerID.toString(), value: "hello from " + peerID.toString() + " " + said_hi }))
      await ipfs.pubsub.publish('msg', msg)

    } catch (err) {
      log('An error occurred trying to check our peers:', err)
    }
  }, 2000)
})
