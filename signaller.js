import { sigServer } from '@libp2p/webrtc-star-signalling-server'

//https://github.com/libp2p/js-libp2p-webrtc-star/tree/master/packages/webrtc-star-signalling-server

// can get the sig serve address by going to the following in a browser: 
// localhost:24642

// deploy
//https://github.com/libp2p/js-libp2p-webrtc-star/blob/master/packages/webrtc-star-signalling-server/DEPLOYMENT.md

const server = await sigServer({
    port: 24642,
    host: '0.0.0.0',
    metrics: true
})

async function main() {
    try {
        await server.start()

    } catch (error) {
        await server.stop()
        console.log(error)
    }
}
main()
// some time later