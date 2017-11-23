echo "//////////////////////////////////"
echo "Start to intall node js paackagese"
echo "//////////////////////////////////"
npm install
echo "//////////////////////////////////"
echo "   start to build configtxlator"
echo "//////////////////////////////////"
GOPATH=$(pwd)/gopath
echo $GOPATH
cd gopath/src/configtxlator
GOPATH=$GOPATH go build
