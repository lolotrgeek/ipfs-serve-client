import { createLibp2p } from 'libp2p'
import * as IPFS from 'ipfs-core'
import { webRTCDirect } from '@libp2p/webrtc-direct'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { bootstrap } from '@libp2p/bootstrap'
import { webRTCStar } from '@libp2p/webrtc-star'
import { webSockets } from '@libp2p/websockets'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
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

document.addEventListener('DOMContentLoaded', async () => {
  const peers = []
  const wrtcStar = webRTCStar()
  // use the same peer id as in `listener.js` to avoid copy-pasting of listener's peer id into `peerDiscovery`
  const hardcodedPeerId = '12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m'
  const bootstrapNode = [`/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/${hardcodedPeerId}`]

  let peerID = await createEd25519PeerId()

  const libp2pBundle = async () => await createLibp2p({
    peerId: peerID,
    transports: [webSockets(), webRTCDirect(), wrtcStar.transport],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
    pubsub: gossipsub({ allowPublishToZeroPeers: true }),
    peerDiscovery: [
      wrtcStar.discovery,
      bootstrap({ list: bootstrapNode })
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
  const peerlist = document.getElementById('peerlist')
  const output = document.getElementById('output')
  status.textContent = ''
  output.textContent = ''

  function updateStatus(txt) {
    console.info(txt)
    status.textContent = `${txt.trim()}`
  }

  function updatePeerList(txt) {
    peerlist.textContent = `${txt.trim()}`
  }

  function log(txt) {
    console.info(txt)
    output.textContent = `${txt.trim()}`
  }

  const config = await ipfs.config.getAll()
  console.log(config)

  updateStatus("ipfs is ready " + peerID.toString())
  // Lets log out the number of peers we have every 2 seconds

  ipfs.pubsub.subscribe('msg', (msg) => {
    let parsedmsg = JSON.parse(decodeMessage(msg))
    if (parsedmsg.signer !== config.Identity.PeerID) log(parsedmsg.value)
  })

  let attempts = []
  ipfs.pubsub.subscribe('peers', msg => {
    try {
      let remote_peers = JSON.parse(decodeMessage(msg))
      remote_peers.forEach(remote_peer => {
        if (remote_peer.peer === config.Identity.PeerID) return
        peers.find(peer => peer.peer === remote_peer.peer) || peers.push(remote_peer)

        let address = `${remote_peer.addr}/http/p2p-webrtc-direct/p2p/${remote_peer.peer}`
        let index = attempts.findIndex(attempt => attempt.address === address)
        if (index === -1) attempts.push({ address, attempted: 0 })
        else if (attempts[index].attempted > 3) return
        else {
          attempts[index].attempted++
          ipfs.swarm.connect(address).catch(err => {
            console.log(`Could not dial ${address}, tries ${attempts[index].attempted}`, err)
          })
        }

        // remove any remote peers that are not in peers
      })
      peers.forEach((peer, index) => {
        if (remote_peers.find(remote_peer => remote_peer.peer === peer.peer) === undefined) {
          console.log("removing peer", peer)
          peers.splice(index, 1)
        }
      })

      updatePeerList(`Peers: ${peers.map(peer => peer.peer).join(', ')}`)
    } catch (error) {
      console.log(error)
    }

  })

  let said_hi = 0

  setInterval(async () => {
    try {
      // const peers = await ipfs.swarm.peers()

      said_hi++
      ipfs.pubsub.publish('msg', new TextEncoder().encode(JSON.stringify({ signer: config.Identity.PeerID, value: "hello from " + config.Identity.PeerID + " " + said_hi })))


    } catch (err) {
      log('An error occurred trying to check our peers:', err)
    }
  }, 2000)
})
