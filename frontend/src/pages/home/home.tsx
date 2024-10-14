import { Button, Table, Spin, message, Input, Modal } from 'antd';
import { UserOutlined } from "@ant-design/icons";
import { useEffect, useState } from 'react';
import { BuyMyRoomContract, web3 , MyERC20Contract} from "../../utils/contract"; // 导入合约

// 定义 HouseInfo 接口
interface HouseInfo {
    tokenId: number;
    owner: string;
    listedTimestamp: number;
    isForSale: boolean;
    price: number;
}

const HomePage = () => {
    const [account, setAccount] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [houses, setHouses] = useState<HouseInfo[]>([]);
    const [loadingHouses, setLoadingHouses] = useState<boolean>(true);
    const [forSaleHouses, setForSaleHouses] = useState<HouseInfo[]>([]);
    
    // 新增状态管理
    const [erc20Balance, setErc20Balance] = useState<number>(0);
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [tokenId, setTokenId] = useState<number | undefined>(undefined);
    const [price, setPrice] = useState<number | undefined>(undefined);
    const [ethAmount, setEthAmount] = useState<number | undefined>(undefined);
    const [isTokenModalVisible, setIsTokenModalVisible] = useState<boolean>(false);

    useEffect(() => {
        const initCheckAccounts = async () => {
            const { ethereum } = window as any;
            if (ethereum && ethereum.isMetaMask) {
                const accounts = await web3.eth.getAccounts();
                if (accounts && accounts.length) {
                    setAccount(accounts[0]);
                    await fetchUserHouses(accounts[0]);
                    // 移除自动获取ERC20余额的调用
                }
            }
            setLoading(false);
        };

        initCheckAccounts();
    }, []);

    const fetchErc20Balance = async (userAddress: string) => {
        try {
            const balance = await BuyMyRoomContract.methods.getUserTokenBalance().call({ from: userAddress });
            console.log('原始余额:', balance);
            const balanceInEth = Number(balance) / (10 ** 18);
            setErc20Balance(balanceInEth);
        } catch (error) {
            if (error instanceof Error) {
                message.error('获取ERC20积分余额失败: ' + error.message);
            } else {
                message.error('获取ERC20积分余额失败: 未知错误');
            }
        }
    };

    
    const handleCheckErc20Balance = () => {
        if (account) {
            fetchErc20Balance(account);
        } else {
            message.error('请先连接钱包');
        }
    };

    const handleConnectWallet = async () => {
        const { ethereum } = window as any;
        if (!ethereum || !ethereum.isMetaMask) {
            alert('请安装 MetaMask!');
            return;
        }

        try {
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            setAccount(accounts[0]);
            await fetchUserHouses(accounts[0]);
            // 移除自动获取ERC20余额的调用
        } catch (error) {
            alert('连接钱包失败');
        }
    };

    const fetchUserHouses = async (userAddress: string) => {
        setLoadingHouses(true);
        try {
            const totalSupply: number = await BuyMyRoomContract.methods.totalSupply().call();
            const userHouses: HouseInfo[] = [];

            for (let i = 0; i < totalSupply; i++) {
                const houseInfo: any = await BuyMyRoomContract.methods.getHouseInfo(i).call();
                if (houseInfo.owner.toLowerCase() === userAddress.toLowerCase()) {
                    userHouses.push({ 
                        tokenId: i,
                        owner: houseInfo.owner,
                        listedTimestamp: Number(houseInfo.listedTimestamp),
                        isForSale: houseInfo.isForSale,
                        price: Number(houseInfo.price) / (10 ** 18),
                    });
                }
            }

            setHouses(userHouses);
        } catch (error: unknown) {
            if (error instanceof Error) {
                message.error('获取房产信息失败: ' + error.message);
            } else {
                message.error('获取房产信息失败');
            }
        } finally {
            setLoadingHouses(false);
        }
    };

    const fetchForSaleHouses = async () => {
        console.log('Fetching for sale houses...');
        try {
            const housesForSale: any[] = await BuyMyRoomContract.methods.getAllForSaleHouses().call();
            console.log('Houses for sale:', housesForSale);
            
            const formattedHouses: HouseInfo[] = housesForSale.map((house: any) => ({
                tokenId: Number(house.tokenId),
                owner: house.owner,
                listedTimestamp: Number(house.listedTimestamp),
                isForSale: house.isForSale,
                price: Number(house.price) / (10 ** 18),
            }));

            setForSaleHouses(formattedHouses);

            if (formattedHouses.length === 0) {
                message.info('目前没有房屋在出售。');
            }
        } catch (error: any) {
            console.error('Error fetching for sale houses:', error);
            message.error('获取正在出售的房屋信息失败: ' + (error.message || '未知错误'));
        }
    };

    const buyHouse = async (tokenId: number, price: number) => {
        try {
            // 直接使用价格（假设 price 是以 ERC20 积分为单位）
            const priceInTokens = price.toString();
    
            console.log('Attempting to buy house with tokenId:', tokenId, 'Price in tokens:', priceInTokens);
    
            // 授权合约转移 ERC20 代币
            await MyERC20Contract.methods.approve(BuyMyRoomContract.options.address, priceInTokens).send({
                from: account,
            });
    
            // 购买房屋
            await BuyMyRoomContract.methods.buyHouse(tokenId).send({ from: account }); 
            message.success('购买成功！');
    
            // 刷新数据
            fetchUserHouses(account); // 刷新用户房产信息
            fetchForSaleHouses(); // 刷新出售房屋信息
            fetchErc20Balance(account); // 刷新ERC20积分余额
        } catch (error: any) {
            console.error('Error buying house:', error);
            message.error('购买房屋失败: ' + (error.message || '未知错误'));
        }
    };
    const handleListHouse = async () => {
        if (!price || !tokenId) {
            message.error('请输入有效的房产ID和价格');
            return;
        }
    
        try {
            // 将价格从 ETH 转换为 wei
            const priceInWei = web3.utils.toWei(price.toString(), 'ether');
    
            await BuyMyRoomContract.methods.listHouse(tokenId, priceInWei).send({ from: account });
            message.success('房屋成功出售');
            fetchUserHouses(account);
            setIsModalVisible(false);
            setTokenId(undefined);
            setPrice(undefined);
        } catch (error: any) {
            console.error('Error listing house:', error);
            message.error('出售房屋失败: ' + (error.message || '未知错误'));
        }
    };

    const handleLogout = () => {
        setAccount('');
        setHouses([]);
        setErc20Balance(0); // 重置ERC20积分余额
        message.success('已成功退出钱包');
    };

    const onClaimTokenAirdrop = async () => {
        if (account === '') {
            alert('You have not connected wallet yet.');
            return;
        }

        if (BuyMyRoomContract) {
            try {
                await BuyMyRoomContract.methods.assignThreeUnownedHousesToUser().send({ from: account });
                alert('You have Three houses now.');
                window.location.reload();
            } catch (error: any) {
                alert(error.message);
            }
        } else {
            alert('Contract not exists.');
        }
    };

    const buyTokens = async () => {
        if (!ethAmount || ethAmount <= 0) {
            message.error('请输入有效的以太币数量');
            return;
        }
    
        try {
            // 将以太币数量转换为 wei
            const amountInWei = web3.utils.toWei(ethAmount.toString(), 'ether');
            
            // 调用合约的 buyTokens 方法，发送交易
            await BuyMyRoomContract.methods.buyTokens().send({ from: account, value: amountInWei });
            
            message.success('成功兑换 ERC20 积分！');
            setIsTokenModalVisible(false);
            setEthAmount(undefined);
            
            // 刷新 ERC20 积分余额
            fetchErc20Balance(account); 
        } catch (error: any) {
            message.error('兑换失败: ' + (error.message || '未知错误'));
        }
    };

    const columnsForSale = [
        {
            title: '房产ID',
            dataIndex: 'tokenId',
            key: 'tokenId',
        },
        {
            title: '拥有者',
            dataIndex: 'owner',
            key: 'owner',
        },
        {
            title: '价格',
            dataIndex: 'price',
            key: 'price',
            render: (text: number) => `${text} ERC积分`,
        },
        {
            title: '状态',
            dataIndex: 'isForSale',
            key: 'isForSale',
            render: (text: boolean) => (text ? '出售中' : '未出售'),
        },
        {
            title: '列出时间',
            dataIndex: 'listedTimestamp',
            key: 'listedTimestamp',
            render: (text: number) => new Date(text * 1000).toLocaleString(),
        },
        {
            title: '操作',
            key: 'action',
            render: (text: any, record: HouseInfo) => (
                <Button 
                    type="primary" 
                    onClick={() => buyHouse(record.tokenId, record.price)} 
                >
                    购买
                </Button>
            ),
        },
    ];

    const columnsUserHouses = [
        {
            title: '房产ID',
            dataIndex: 'tokenId',
            key: 'tokenId',
        },
        {
            title: '拥有者',
            dataIndex: 'owner',
            key: 'owner',
        },
        {
            title: '价格',
            dataIndex: 'price',
            key: 'price',
            render: (text: number) => `${text} ERC积分`,
        },
        {
            title: '状态',
            dataIndex: 'isForSale',
            key: 'isForSale',
            render: (text: boolean) => (text ? '出售中' : '未出售'),
        },
        {
            title: '获得时间',
            dataIndex: 'listedTimestamp',
            key: 'listedTimestamp',
            render: (text: number) => new Date(text * 1000).toLocaleString(),
        },
    ];

    return (
        <div>
            <h1>欢迎来到房屋交易系统!</h1>
            <div>
                {loading ? (
                    <Spin tip="正在检查钱包连接..." />
                ) : (
                    <>
                        <div>当前用户: {account || '无用户连接'}</div>
                        <div>您的ERC20积分余额: {erc20Balance}</div>
                        {!account ? (
                            <Button type="primary" onClick={handleConnectWallet} icon={<UserOutlined />}>
                                连接钱包
                            </Button>
                        ) : (
                            <>
                                <Button type="primary" onClick={handleLogout}>
                                    退出登录
                                </Button>
                                <Button type="primary" onClick={onClaimTokenAirdrop} style={{ marginLeft: '10px' }}>
                                    分配三处房产
                                </Button>
                                <Button type="primary" onClick={fetchForSaleHouses} style={{ marginLeft: '10px' }}>
                                    获取正在出售的房屋
                                </Button>
                                <Button 
                                    type="primary" 
                                    onClick={() => setIsModalVisible(true)} 
                                    style={{ marginLeft: '10px' }}
                                >
                                    出售房产
                                </Button>
                                <Button 
                                    type="primary" 
                                    onClick={() => setIsTokenModalVisible(true)} 
                                    style={{ marginLeft: '10px' }}
                                >
                                    兑换 ERC20 积分
                                </Button>
                                {/* 新增查询ERC20余额的按钮 */}
                                <Button 
                                    type="default" 
                                    onClick={handleCheckErc20Balance} 
                                    style={{ marginLeft: '10px' }}
                                >
                                    查询 ERC20 余额
                                </Button>
                            </>
                        )}
                    </>
                )}
            </div>

            <Modal
                title="列出房产"
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleListHouse}
            >
                <Input 
                    placeholder="输入房产ID" 
                    type="number" 
                    value={tokenId} 
                    onChange={(e) => setTokenId(Number(e.target.value))} 
                    style={{ marginBottom: '10px' }} 
                />
                <Input 
                    placeholder="输入价格" 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(Number(e.target.value))} 
                    style={{ marginBottom: '10px' }} 
                />
            </Modal>

            {/* 兑换 ERC20 积分的模态框 */}
            <Modal
                title="兑换 ERC20 积分"
                visible={isTokenModalVisible}
                onCancel={() => setIsTokenModalVisible(false)}
                onOk={buyTokens}
            >
                <Input 
                    placeholder="输入以太币数量" 
                    type="number" 
                    value={ethAmount} 
                    onChange={(e) => setEthAmount(Number(e.target.value))} 
                    style={{ marginBottom: '10px' }} 
                />
            </Modal>

            {account && (
                <div style={{ marginTop: '20px' }}>
                    <h2>您的房产</h2>
                    {loadingHouses ? (
                        <Spin tip="正在加载您的房产..." />
                    ) : (
                        <Table 
                            dataSource={houses} 
                            columns={columnsUserHouses} 
                            rowKey="tokenId" 
                        />
                    )}
                </div>
            )}

            {forSaleHouses.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h2>正在出售的房屋</h2>
                    <Table 
                        dataSource={forSaleHouses} 
                        columns={columnsForSale} 
                        rowKey="tokenId" 
                    />
                </div>
            )}
        </div>
    );
};

export default HomePage;