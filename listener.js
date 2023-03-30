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

import { decodeMessage } from './utils.js'
import * as IPFS from 'ipfs-core'
import { createRepo } from 'ipfs-repo'
import * as dagPb from '@ipld/dag-pb'
import * as dagCbor from '@ipld/dag-cbor'
import { MemoryDatastore } from 'datastore-core/memory'
import { BlockstoreDatastoreAdapter } from 'blockstore-datastore-adapter'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { FsDatastore } from 'datastore-fs'
import { FSLock } from 'ipfs-repo/locks/fs'


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// import migrations from 'ipfs-repo-migrations'

function loadCodec(codeOrName) {
  /** @type {Record<string | number, BlockCodec>} */
  const lookup = {
    [dagPb.code]: dagPb,
    [dagPb.name]: dagPb,
    [dagCbor.code]: dagCbor,
    [dagCbor.name]: dagCbor
  }

  return Promise.resolve(lookup[codeOrName])
}

; (async () => {
  const wrtcStar = webRTCStar()

  // hardcoded peer id to avoid copy-pasting of listener's peer id into the dialer's bootstrap list
  // generated with cmd `peer-id --type=ed25519`
  let ourInfo = {
    "id": "12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m",
    "privKey": "CAESQAG6Ld7ev6nnD0FKPs033/j0eQpjWilhxnzJ2CCTqT0+LfcWoI2Vr+zdc1vwk7XAVdyoCa2nwUR3RJebPWsF1/I=",
    "pubKey": "CAESIC33FqCNla/s3XNb8JO1wFXcqAmtp8FEd0SXmz1rBdfy"
  }
  const hardcodedPeerId = await createFromJSON(ourInfo)

  let path = __dirname+'/listener'

  const libp2pBundle = async () => await createLibp2p({
    peerId: hardcodedPeerId,
    addresses: {
      listen: [
        '/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct',
        '/ip4/0.0.0.0/tcp/0',
        '/ip4/127.0.0.1/tcp/9099/ws'
      ]
    },
    pubsub: gossipsub({ allowPublishToZeroPeers: true, emitSelf: false }),
    transports: [webRTCDirect({ wrtc }), webSockets(), tcp(), wrtcStar.transport],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
    peerDiscovery: [
      wrtcStar.discovery,
      pubsubPeerDiscovery({ interval: 1000 })
    ],
  })


  let repo = createRepo(path, loadCodec, {
    /**
     * IPFS repos store different types of information in separate datastores.
     * Each storage backend can use the same type of datastore or a different one — for example
     * you could store your keys in a levelDB database while everything else is in files.
     * See https://www.npmjs.com/package/interface-datastore for more about datastores.
     */
    root: new FsDatastore(path, {
      extension: '.ipfsroot', // Defaults to '', appended to all files
      errorIfExists: false, // If the datastore exists, don't throw an error
      createIfMissing: true // If the datastore doesn't exist yet, create it
    }),
    // blocks is a blockstore, all other backends are datastores - but we can wrap a datastore
    // in an adapter to turn it into a blockstore
    blocks: new BlockstoreDatastoreAdapter(
      new FsDatastore(`${path}/blocks`, {
        extension: '.ipfsblock',
        errorIfExists: false,
        createIfMissing: true
      })
    ),
    keys: new FsDatastore(`${path}/keys`, {
      extension: '.ipfskey',
      errorIfExists: false,
      createIfMissing: true
    }),
    datastore: new FsDatastore(`${path}/datastore`, {
      extension: '.ipfsds',
      errorIfExists: false,
      createIfMissing: true
    }),
    pins: new FsDatastore(`${path}/pins`, {
      extension: '.ipfspin',
      errorIfExists: false,
      createIfMissing: true
    })
  })
  // await repo.init({})
  // await repo.open()

  const ipfs = await IPFS.create({
    repo,
    libp2p: libp2pBundle,
    config: { Addresses: { Delegates: [], Bootstrap: [] }, Bootstrap: [] },
  })




  let last_msg = "{data: 'no messages yet'}"
  ipfs.pubsub.subscribe('msg', evt => {
    let msg = decodeMessage(evt.data)
    last_msg = msg
  })

  setInterval(async () => {
    try {
      console.clear()
      const peers = await ipfs.swarm.addrs()
      console.log('Our peer id:', ourInfo.id)
      console.log(`The node now has ${peers.length} peers.`)
      console.log('Peers:', peers.map(p => p.id ? p.id : Object.keys(p)))
      console.log('Last message:', last_msg)


    } catch (err) {
      console.log('An error occurred trying to check our peers:', err)
    }
  }, 2000)

  process.stdin.resume();//so the program will not close instantly

  function exitHandler(options, exitCode) {
    repo.close()
    if (options.cleanup) console.log('clean');
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
  }

  //do something when app is closing
  process.on('exit', exitHandler.bind(null, { cleanup: true }));

  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, { exit: true }));

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
  process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
})()
