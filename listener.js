import { createLibp2p } from 'libp2p'
import * as IPFS from 'ipfs-core'
import { webRTCDirect } from '@libp2p/webrtc-direct'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { tcp } from '@libp2p/tcp'
import { mdns } from '@libp2p/mdns'
import { createFromJSON } from '@libp2p/peer-id-factory'
import wrtc from 'wrtc'

  ; (async () => {
    // hardcoded peer id to avoid copy-pasting of listener's peer id into the dialer's bootstrap list
    // generated with cmd `peer-id --type=ed25519`
    const hardcodedPeerId = await createFromJSON({
      "id": "12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m",
      "privKey": "CAESQAG6Ld7ev6nnD0FKPs033/j0eQpjWilhxnzJ2CCTqT0+LfcWoI2Vr+zdc1vwk7XAVdyoCa2nwUR3RJebPWsF1/I=",
      "pubKey": "CAESIC33FqCNla/s3XNb8JO1wFXcqAmtp8FEd0SXmz1rBdfy"
    })
    const libp2pBundle = async () => await createLibp2p({
      peerId: hardcodedPeerId,
      addresses: {
        listen: [
          '/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct',
          '/ip4/0.0.0.0/tcp/0'
        ]
      },
      transports: [webRTCDirect({ wrtc }),tcp()],
      streamMuxers: [mplex()],
      connectionEncryption: [noise()]
    })

    const ipfs = await IPFS.create({
      repo: "listener" + Math.random(),
      libp2p: libp2pBundle
    })

    // const node = await libp2pBundle()

    // node.connectionManager.addEventListener('peer:connect', (evt) => {
    //   console.info(`Connected to ${evt.detail.remotePeer.toString()}!`)
    // })

    // console.log('Listening on:')
    // node.getMultiaddrs().forEach((ma) => console.log(ma.toString()))


    // Lets log out the number of peers we have every 2 seconds
    setInterval(async () => {
      try {
        console.clear()
        const peers = await ipfs.swarm.peers()
        console.log(`The node now has ${peers.length} peers.`)

        // if (peers.length === 0) {
        //     console.log("Connecting to bootstrap node...")
        //     const bootstrapNode = multiaddr("/ip4/192.168.50.57/tcp/4001")
        //     node.swarm.connect(bootstrapNode.toString())
        // }


      } catch (err) {
        console.log('An error occurred trying to check our peers:', err)
      }
    }, 2000)
  })()
