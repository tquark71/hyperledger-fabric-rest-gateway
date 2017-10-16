npm install

GOPATH=$(pwd)/server/gopath
echo $GOPATH
cd server/gopath/src/configtxlator
go build
