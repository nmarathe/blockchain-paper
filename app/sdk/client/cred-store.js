/**
 * Demonstrates the setup of the credential store
 */
const fs = require('fs');
const Client = require('fabric-client');

// Constants for profile, wallet & user
const CONNECTION_PROFILE_PATH = '../profiles/dev-connection.yaml'

// Client section configuration
const REQ_CLIENT_CONNECTION_PROFILE_PATH = '../profiles/requirements-client.yaml'
const DESGRP_CLIENT_CONNECTION_PROFILE_PATH = '../profiles/designgroup-client.yaml'
const SIM_CLIENT_CONNECTION_PROFILE_PATH = '../profiles/simulation-client.yaml'

var CRYPTO_CONFIG_PEER_ORGANIZATIONS = null

const    client = Client.loadFromConfig(CONNECTION_PROFILE_PATH)

// Below 2 lines are equivalent to the above line
// const client=new Client()
// client.loadFromConfig(CONNECTION_PROFILE_PATH)


main()

// Main function
async function main(){
    // Check if org and name are provided
    if (process.argv.length < 4){
        console.log("Usage:  node   cred-store.js   org    user-name")
        process.exit(1)
    }

    // Set the org and name local variables
    let org = process.argv[2]
    let user = process.argv[3]

    // Load the client section for the organization
    // This has the location of the credential store
    if(org == 'Requirements'){
        org = 'requirements.oem.com'
        CRYPTO_CONFIG_PEER_ORGANIZATIONS ='../../../orgs/oem-requirements/crypto-config/peerOrganizations/requirements.oem.com'
        // Requirements client setup
        client.loadFromConfig(REQ_CLIENT_CONNECTION_PROFILE_PATH)
    } else if(org == 'DesignGroup'){
        org = 'designgroup.oem.com'
        CRYPTO_CONFIG_PEER_ORGANIZATIONS ='../../../orgs/oem-designgrp/crypto-config/peerOrganizations/designgroup.oem.com'
        // Design client setup
        client.loadFromConfig(DESGRP_CLIENT_CONNECTION_PROFILE_PATH)
    }else if(org == 'Simulation') {
        org = 'simutationgroup.com'
        CRYPTO_CONFIG_PEER_ORGANIZATIONS = '../../../orgs/simulationgrp/crypto-config/peerOrganizations/simutationgroup.com'
        // Simulation client setup
        client.loadFromConfig(SIM_CLIENT_CONNECTION_PROFILE_PATH)
    } else {
        console.log("Unknown organization:", org)
        process.exit(1)
    }

    // Initialize the store
    await initCredentialStore()

    // Lets get the specified user from the store
    let userContext = await client.loadUserFromStateStore(user)

    // If user is null then the user does not exist
    if( userContext == null ){
        
        // Create the user context
        userContext = await createUserContext(org, user)

        console.log(`Created ${user} under the credentials store!!`)
    } else {
        console.log(`User ${user} already exist!!`)
    }

    // Setup the context on the client
    await client.setUserContext(userContext, false)

    // At this point client can be used for sending requests to Peer | Orderer
}



/**
 * Initialize the file system credentials store
 */
async function initCredentialStore() {

    // Call the function for initializing the credentials store on file system
    await client.initCredentialStores()
        .then((done) => {
            console.log("initCredentialStore(): ", done)
        })
}

/**
 * Setup the user context
 **/
async function createUserContext(org, user) {
    // Get the path  to user private key
    let privateKeyPath = getPrivateKeyPath(org, user)

    // Get the path to the user certificate
    let certPath = getCertPath(org, user)

    // Setup the options for the user context
    // Global Type: UserOpts 
    let opts = {
        username: user,
        mspid: createMSPId(org),
        cryptoContent: {
            privateKey: privateKeyPath,
            signedCert: certPath
        },
        // Set this to true to skip persistence
        skipPersistence: false
    }
    
    // Setup the user 
    let userContext = await client.createUser(opts)

    return userContext
}

/**
 * Reads content of the certificate
 * @param {string} org 
 * @param {string} user 
 */
function getCertPath(org, user) {
    //budget.com/users/Admin@budget.com/msp/signcerts/Admin@budget.com-cert.pem"
    var certPath = CRYPTO_CONFIG_PEER_ORGANIZATIONS + "/users/" + user + "@" + org + "/msp/signcerts/" + user + "@" + org + "-cert.pem"
    return certPath
}

/**
 * Reads the content of users private key
 * @param {string} org 
 * @param {string} user 
 */
function getPrivateKeyPath(org, user) {
    // ../crypto/crypto-config/peerOrganizations/budget.com/users/Admin@budget.com/msp/keystore/05beac9849f610ad5cc8997e5f45343ca918de78398988def3f288b60d8ee27c_sk
    var pkFolder = CRYPTO_CONFIG_PEER_ORGANIZATIONS + "/users/" + user + "@" + org + "/msp/keystore"
    fs.readdirSync(pkFolder).forEach(file => {
        // console.log(file);
        // return the first file
        pkfile = file
        return
    })

    return (pkFolder + "/" + pkfile)
}

/**
 * Creates the MSP ID from the org name for 'acme' it will be 'AcmeMSP'
 * @param {string} org 
 */
function createMSPId(org) {
    if(org == 'requirements.oem.com') {
        return 'RequirementsMSP'
    }else if(org == 'designgroup.oem.com') {
        return 'DesignGroupMSP'
    }else if(org == 'simutationgroup.com'){
        return 'SimulationGroupMSP'
    }else{
        return 'UnknownMSP'
    }
} 