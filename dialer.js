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
    config: {Addresses: {Delegates: [],Bootstrap: []},Bootstrap: []},
  })
  const status = document.getElementById('status')
  const peerlist = document.getElementById('peerlist')
  const output = document.getElementById('output')
  const attemptslist = document.getElementById('attempts')
  status.textContent = ''
  output.textContent = ''

  function updateStatus(txt) {
    console.info(txt)
    status.textContent = `${txt.trim()}`
  }

  function updatePeerList(txt) {
    peerlist.textContent = `${txt.trim()}`
  }
  function updateAttemptsList(txt) {
    attemptslist.textContent = `${txt.trim()}`
  }

  function log(txt) {
    console.info(txt)
    output.textContent = `${txt.trim()}`
  }


  updateStatus("ipfs is ready " + peerID.toString())
  // Lets log out the number of peers we have every 2 seconds

  ipfs.pubsub.subscribe('msg', (msg) => {
    let parsedmsg = JSON.parse(decodeMessage(msg))
    if (parsedmsg.signer !== peerID) log(parsedmsg.value)
  })

  // const peers = []
  // let attempts = []
  // ipfs.pubsub.subscribe('peers', msg => {
  //   try {
  //     let remote_peers = JSON.parse(decodeMessage(msg))
  //     console.log("peers:", remote_peers)
  //     remote_peers.forEach(remote_peer => {
  //       if(!remote_peer || !remote_peer.addrs) return
  //       if (remote_peer.id === peerID) return

  //       if(!remote_peer.addrs[0] || remote_peer.addrs.length === 0) return
  //       let id = remote_peer.id
  //       // let address = remote_peer.addrs[0].toString()+"/p2p/"+remote_peer.id
  //       let address = remote_peer.addrs[0]

  //       peers.find(peer => peer.id === remote_peer.id) || peers.push({ id, address})

  //       let index = attempts.findIndex(attempt => attempt.address === address)
        
  //       if (index === -1) attempts.push({ id, address, attempted: 0 })
  //       else if (attempts[index].attempted > 3) return
  //       else {
  //         setTimeout(() => {
  //           attempts[index].attempted++
  //           ipfs.swarm.connect(id).catch(err => {
  //             console.log(`Could not dial ${address}, tries ${attempts[index].attempted}`, err)
  //           })
  //         }, 1000)
  //       }

  //       // remove any remote peers that are not in peers
  //     })
  //     peers.forEach((peer, index) => {
  //       if (remote_peers.find(remote_peer => remote_peer.peer === peer.peer) === undefined) {
  //         console.log("removing peer", peer)
  //         peers.splice(index, 1)
  //       }
  //     })


  //     updatePeerList(`Peers: ${peers.map(peer => peer.address).join(', \n')}`)
  //     updateAttemptsList(`Attempts: ${attempts.map(JSON.stringify).join(',\n')}`)
  //   } catch (error) {
  //     console.log(error)
  //   }

  // })

  let said_hi = 0

  setInterval(async () => {
    try {
      // const peers = await ipfs.swarm.peers()
      const peers = await ipfs.swarm.addrs()
      console.log("Peers:", peers)
      updatePeerList(`Peers: ${peers.map(peer => peer.addrs+peer.id).join(', \n')}`)

      said_hi++
      ipfs.pubsub.publish('msg', new TextEncoder().encode(JSON.stringify({ signer: peerID.toString(), value: "hello from " + peerID.toString() + " " + said_hi })))


    } catch (err) {
      log('An error occurred trying to check our peers:', err)
    }
  }, 2000)
})
