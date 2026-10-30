import {createApp} from '../../server/b2b/app.mjs';
// Browser fixtures create independent schools in one process. Production keeps its default budget.
const {server}=createApp({registrationBudget:100});
server.listen(Number(process.env.PORT||4186),'127.0.0.1');
process.on('SIGTERM',()=>server.close());
