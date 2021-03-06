echo /////////////////////////////////////////////////////////////
echo "start to set up three org, one for orderer, to for peers"
echo "summary: 1 orderer, 2 ca node, 4 peer node, 4 couch db node"
echo /////////////////////////////////////////////////////////////
docker-compose -f two-org-solo-couch.yaml up -d
echo /////////////////////////////////////////////////////////////
echo           "hyperledger network set up finish"
echo /////////////////////////////////////////////////////////////
echo
echo /////////////////////////////////////////////////////////////
echo              "set up mongo node for gateway"
echo /////////////////////////////////////////////////////////////
docker-compose -f mongo.yaml up -d
echo
echo /////////////////////////////////////////////////////////////
echo               "mongo node set up finish"
echo /////////////////////////////////////////////////////////////