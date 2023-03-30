import { createLibp2p } from 'libp2p'
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
      return new TextDecoder().decode(msg)
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

  const libp2p = await createLibp2p({
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
      bootstrap({ list: bootstrapNode })
    ],
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
  function updateMessage(txt) {
    message.textContent = `${txt.trim()}`
  }

  function log(txt) {
    console.info(txt)
    output.textContent += `${txt.trim()} \n`
  }


  updateStatus("libp2p is ready " + peerID.toString())
  // Lets log out the number of peers we have every 2 seconds

  // Listen for new peers
  libp2p.addEventListener('peer:discovery', (evt) => {
    log(`Found peer ${evt.detail.id.toString()}`)

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

  updateStatus(`libp2p id is ${libp2p.peerId.toString()}`)
  let said_hi = 0

  libp2p.pubsub.addEventListener('message', evt => {
    let msg = decodeMessage(evt.detail.data)
    if (evt.detail.topic === 'msg') {
      updateMessage(`Message: ${msg}`)
    }
  })
  libp2p.pubsub.subscribe(('msg'))
  libp2p.pubsub.subscribe(('peers'))

  setInterval(async () => {
    try {
      let peers = await libp2p.peerStore.all()
      updatePeerList(`Peers: ${peers.map(peer => peer.id).join(', \n')}`)

      said_hi++
      let msg = new TextEncoder().encode(JSON.stringify({ signer: peerID.toString(), value: "hello from " + peerID.toString() + " " + said_hi }))
      await libp2p.pubsub.publish('msg', msg)

    } catch (err) {
      log('An error occurred trying to check our peers:', err)
    }
  }, 2000)
})
