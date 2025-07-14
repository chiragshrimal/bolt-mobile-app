
// middleware m jo request aa rhu hai usme userId ka type define kiya hai 
declare namespace Express{
    interface Request{
        userId? : string ;
    }
}