// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Minimal, dependency-free sample contracts used to seed a local devnet with
/// realistic activity (ERC-20/721/1155 transfers, internal value transfers,
/// CREATE2 deployments and reverts). Not audited; for development only.

contract SampleToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public owner;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error NotOwner(address caller);

    constructor(string memory _name, string memory _symbol, uint256 initialSupply) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "burn exceeds balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "transfer exceeds balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

contract SampleNFT {
    string public name = "Sample Collectibles";
    string public symbol = "SNFT";
    uint256 public totalSupply;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x80ac58cd || id == 0x01ffc9a7 || id == 0x5b5e139f;
    }

    function tokenURI(uint256 tokenId) external pure returns (string memory) {
        return string(abi.encodePacked("ipfs://sample/", _toString(tokenId)));
    }

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = ++totalSupply;
        ownerOf[tokenId] = to;
        balanceOf[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(ownerOf[tokenId] == from && msg.sender == from, "not owner");
        ownerOf[tokenId] = to;
        balanceOf[from] -= 1;
        balanceOf[to] += 1;
        emit Transfer(from, to, tokenId);
    }

    function _toString(uint256 v) internal pure returns (string memory s) {
        if (v == 0) return "0";
        uint256 len;
        for (uint256 t = v; t != 0; t /= 10) len++;
        bytes memory b = new bytes(len);
        for (; v != 0; v /= 10) b[--len] = bytes1(uint8(48 + (v % 10)));
        s = string(b);
    }
}

contract SampleMultiToken {
    mapping(uint256 => mapping(address => uint256)) private _balances;

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return _balances[id][account];
    }

    function uri(uint256) external pure returns (string memory) {
        return "ipfs://sample-multi/{id}.json";
    }

    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata values) external {
        for (uint256 i = 0; i < ids.length; i++) _balances[ids[i]][to] += values[i];
        emit TransferBatch(msg.sender, address(0), to, ids, values);
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata) external {
        require(from == msg.sender, "not owner");
        _balances[id][from] -= value;
        _balances[id][to] += value;
        emit TransferSingle(msg.sender, from, to, id, value);
    }
}

contract PaymentSplitter {
    event Split(address indexed payer, uint256 total, uint256 recipients);

    function split(address payable[] calldata recipients) external payable {
        require(recipients.length > 0, "no recipients");
        uint256 share = msg.value / recipients.length;
        for (uint256 i = 0; i < recipients.length; i++) {
            (bool ok, ) = recipients[i].call{value: share}("");
            require(ok, "send failed");
        }
        emit Split(msg.sender, msg.value, recipients.length);
    }
}

contract Vault {
    address public immutable factory;
    address public owner;

    constructor(address _owner) payable {
        factory = msg.sender;
        owner = _owner;
    }

    receive() external payable {}
}

contract VaultFactory {
    event VaultCreated(address indexed vault, address indexed owner, bytes32 salt);

    function create(bytes32 salt) external payable returns (address vault) {
        vault = address(new Vault{salt: salt, value: msg.value}(msg.sender));
        emit VaultCreated(vault, msg.sender, salt);
    }
}
