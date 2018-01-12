cd ../../
killall node
GATEWAY_PORT=4001 FABRIC_ORGINDEX=org1  node app.js &
GATEWAY_PORT=4002 FABRIC_ORGINDEX=org2  node app.js &
