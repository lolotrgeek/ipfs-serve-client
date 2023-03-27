import { createLibp2p } from 'libp2p'
import * as IPFS from 'ipfs-core'
import { webRTCDirect } from '@libp2p/webrtc-direct'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { bootstrap } from '@libp2p/bootstrap'
import { tcp } from '@libp2p/tcp'

document.addEventListener('DOMContentLoaded', async () => {
  // use the same peer id as in `listener.js` to avoid copy-pasting of listener's peer id into `peerDiscovery`
  const hardcodedPeerId = '12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m'
  const libp2pBundle = async () => await createLibp2p({
    transports: [webRTCDirect(),tcp()],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
    peerDiscovery: [
      bootstrap({
        list: [
          `/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/${hardcodedPeerId}`,
        ]
      }),
    ]
  })

  const ipfs = await IPFS.create({ 
    repo: "dailer" + Math.random(),
    libp2p: libp2pBundle 
  })
  const status = document.getElementById('status')
  const output = document.getElementById('output')

  output.textContent = ''

  function log(txt) {
    console.info(txt)
    output.textContent += `${txt.trim()}\n`
  }

  log("ipfs is ready")


  // // Listen for new peers
  // libp2p.addEventListener('peer:discovery', (evt) => {
  //   log(`Found peer ${evt.detail.id.toString()}`)

  //   // dial them when we discover them
  //   libp2p.dial(evt.detail.id).catch(err => {
  //     log(`Could not dial ${evt.detail.id}`, err)
  //   })
  // })

  // // Listen for new connections to peers
  // libp2p.connectionManager.addEventListener('peer:connect', (evt) => {
  //   log(`Connected to ${evt.detail.remotePeer.toString()}`)
  // })

  // // Listen for peers disconnecting
  // libp2p.connectionManager.addEventListener('peer:disconnect', (evt) => {
  //   log(`Disconnected from ${evt.detail.remotePeer.toString()}`)
  // })

  // status.innerText = 'libp2p started!'
  // log(`libp2p id is ${libp2p.peerId.toString()}`)

  // Lets log out the number of peers we have every 2 seconds
  setInterval(async () => {
    try {
      const peers = await ipfs.swarm.peers()
      log(`The node now has ${peers.length} peers.`)

    } catch (err) {
      log('An error occurred trying to check our peers:', err)
    }
  }, 2000)
})
