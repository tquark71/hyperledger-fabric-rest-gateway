npm install

GOPATH=$(pwd)/gopath
echo $GOPATH
cd gopath/src/configtxlator
go build
