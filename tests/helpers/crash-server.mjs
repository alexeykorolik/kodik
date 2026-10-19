import {createApp} from '../../server/b2b/app.mjs';
const {server}=createApp({dbPath:process.env.KODIK_DB,secure:false});
server.listen(0,'127.0.0.1',()=>process.send?.({port:server.address().port}));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
