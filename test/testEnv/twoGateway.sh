cd ../../
killall node
GATEWAY_PORT=4001 FABRIC_ORGNAME=org1  node app.js &
GATEWAY_PORT=4002 FABRIC_ORGNAME=org2  node app.js &
