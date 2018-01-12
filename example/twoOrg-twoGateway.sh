 result=${PWD}
 cd ../artifacts/composeFile
 ./startup_prod.sh
 cd $result
cd ../
GATEWAY_PORT=4001 FABRIC_ORGINDEX=org1 node app &
GATEWAY_PORT=4002 FABRIC_ORGINDEX=org2 node app &
