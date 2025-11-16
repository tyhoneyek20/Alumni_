import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { getContractReadOnly, getContractWithSigner } from "./components/useContract";
import "./App.css";
import { useAccount } from 'wagmi';
import { useFhevm, useEncrypt, useDecrypt } from '../fhevm-sdk/src';

interface AlumniData {
  id: string;
  name: string;
  graduationYear: number;
  donationAmount: number;
  timestamp: number;
  creator: string;
  publicValue1: number;
  publicValue2: number;
  isVerified?: boolean;
  decryptedValue?: number;
  description: string;
}

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [alumniList, setAlumniList] = useState<AlumniData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingAlumni, setCreatingAlumni] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ 
    visible: false, 
    status: "pending", 
    message: "" 
  });
  const [newAlumniData, setNewAlumniData] = useState({ 
    name: "", 
    graduationYear: "", 
    donationAmount: "", 
    description: "" 
  });
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniData | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [fhevmInitializing, setFhevmInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { status, initialize, isInitialized } = useFhevm();
  const { encrypt, isEncrypting } = useEncrypt();
  const { verifyDecryption, isDecrypting: fheIsDecrypting } = useDecrypt();

  useEffect(() => {
    const initFhevmAfterConnection = async () => {
      if (!isConnected || isInitialized || fhevmInitializing) return;
      
      try {
        setFhevmInitializing(true);
        await initialize();
      } catch (error) {
        setTransactionStatus({ 
          visible: true, 
          status: "error", 
          message: "FHEVM initialization failed" 
        });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      } finally {
        setFhevmInitializing(false);
      }
    };

    initFhevmAfterConnection();
  }, [isConnected, isInitialized, initialize, fhevmInitializing]);

  useEffect(() => {
    const loadDataAndContract = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }
      
      try {
        await loadData();
        const contract = await getContractReadOnly();
        if (contract) setContractAddress(await contract.getAddress());
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDataAndContract();
  }, [isConnected]);

  const loadData = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const businessIds = await contract.getAllBusinessIds();
      const alumniDataList: AlumniData[] = [];
      
      for (const businessId of businessIds) {
        try {
          const businessData = await contract.getBusinessData(businessId);
          alumniDataList.push({
            id: businessId,
            name: businessData.name,
            graduationYear: Number(businessData.publicValue1) || 0,
            donationAmount: Number(businessData.decryptedValue) || 0,
            timestamp: Number(businessData.timestamp),
            creator: businessData.creator,
            publicValue1: Number(businessData.publicValue1) || 0,
            publicValue2: Number(businessData.publicValue2) || 0,
            isVerified: businessData.isVerified,
            decryptedValue: Number(businessData.decryptedValue) || 0,
            description: businessData.description
          });
        } catch (e) {
          console.error('Error loading alumni data:', e);
        }
      }
      
      setAlumniList(alumniDataList);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Failed to load data" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setIsRefreshing(false); 
    }
  };

  const createAlumni = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setCreatingAlumni(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Creating alumni record with Zama FHE..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const donationAmount = parseInt(newAlumniData.donationAmount) || 0;
      const businessId = `alumni-${Date.now()}`;
      
      const encryptedResult = await encrypt(contractAddress, address, donationAmount);
      
      const tx = await contract.createBusinessData(
        businessId,
        newAlumniData.name,
        encryptedResult.encryptedData,
        encryptedResult.proof,
        parseInt(newAlumniData.graduationYear) || 0,
        0,
        newAlumniData.description
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Waiting for transaction confirmation..." });
      await tx.wait();
      
      setTransactionStatus({ visible: true, status: "success", message: "Alumni record created successfully!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      await loadData();
      setShowCreateModal(false);
      setNewAlumniData({ name: "", graduationYear: "", donationAmount: "", description: "" });
    } catch (e: any) {
      const errorMessage = e.message?.includes("user rejected transaction") 
        ? "Transaction rejected by user" 
        : "Submission failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setCreatingAlumni(false); 
    }
  };

  const decryptData = async (businessId: string): Promise<number | null> => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    }
    
    setIsDecrypting(true);
    try {
      const contractRead = await getContractReadOnly();
      if (!contractRead) return null;
      
      const businessData = await contractRead.getBusinessData(businessId);
      if (businessData.isVerified) {
        const storedValue = Number(businessData.decryptedValue) || 0;
        
        setTransactionStatus({ 
          visible: true, 
          status: "success", 
          message: "Data already verified on-chain" 
        });
        setTimeout(() => {
          setTransactionStatus({ visible: false, status: "pending", message: "" });
        }, 2000);
        
        return storedValue;
      }
      
      const contractWrite = await getContractWithSigner();
      if (!contractWrite) return null;
      
      const encryptedValueHandle = await contractRead.getEncryptedValue(businessId);
      
      const result = await verifyDecryption(
        [encryptedValueHandle],
        contractAddress,
        (abiEncodedClearValues: string, decryptionProof: string) => 
          contractWrite.verifyDecryption(businessId, abiEncodedClearValues, decryptionProof)
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Verifying decryption on-chain..." });
      
      const clearValue = result.decryptionResult.clearValues[encryptedValueHandle];
      
      await loadData();
      
      setTransactionStatus({ visible: true, status: "success", message: "Data decrypted and verified successfully!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      return Number(clearValue);
      
    } catch (e: any) { 
      if (e.message?.includes("Data already verified")) {
        setTransactionStatus({ 
          visible: true, 
          status: "success", 
          message: "Data is already verified on-chain" 
        });
        setTimeout(() => {
          setTransactionStatus({ visible: false, status: "pending", message: "" });
        }, 2000);
        
        await loadData();
        return null;
      }
      
      setTransactionStatus({ 
        visible: true, 
        status: "error", 
        message: "Decryption failed: " + (e.message || "Unknown error") 
      });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    } finally { 
      setIsDecrypting(false); 
    }
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      setTransactionStatus({ 
        visible: true, 
        status: "success", 
        message: "Contract is available and working!" 
      });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Availability check failed" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  const filteredAlumni = alumniList.filter(alumni => 
    alumni.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alumni.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(alumni => 
    activeTab === "all" || 
    (activeTab === "verified" && alumni.isVerified) ||
    (activeTab === "recent" && Date.now()/1000 - alumni.timestamp < 60 * 60 * 24 * 7)
  );

  const stats = {
    totalAlumni: alumniList.length,
    verifiedRecords: alumniList.filter(a => a.isVerified).length,
    totalDonations: alumniList.filter(a => a.isVerified).reduce((sum, a) => sum + (a.decryptedValue || 0), 0),
    recentActivity: alumniList.filter(a => Date.now()/1000 - a.timestamp < 60 * 60 * 24 * 7).length
  };

  if (!isConnected) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <h1>Alumni_Zama 🔐</h1>
            <p>Private Alumni Network</p>
          </div>
          <div className="header-actions">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
          </div>
        </header>
        
        <div className="connection-prompt">
          <div className="connection-content">
            <div className="connection-icon">🎓</div>
            <h2>Welcome to Alumni_Zama</h2>
            <p>Connect your wallet to access the private alumni network with FHE-protected data</p>
            <div className="connection-steps">
              <div className="step">
                <span>1</span>
                <p>Connect wallet to verify alumni status</p>
              </div>
              <div className="step">
                <span>2</span>
                <p>FHE system initializes automatically</p>
              </div>
              <div className="step">
                <span>3</span>
                <p>Access encrypted alumni network</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized || fhevmInitializing) {
    return (
      <div className="loading-screen">
        <div className="fhe-spinner"></div>
        <p>Initializing FHE Encryption System...</p>
        <p className="loading-note">Securing alumni data with Zama FHE</p>
      </div>
    );
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="fhe-spinner"></div>
      <p>Loading alumni network...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>Alumni_Zama 🔐</h1>
          <p>Private Alumni Network</p>
        </div>
        
        <div className="header-actions">
          <button onClick={checkAvailability} className="availability-btn">
            Check Availability
          </button>
          <button onClick={() => setShowCreateModal(true)} className="create-btn">
            + Add Alumni
          </button>
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
        </div>
      </header>
      
      <div className="main-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Alumni</h3>
            <div className="stat-value">{stats.totalAlumni}</div>
          </div>
          <div className="stat-card">
            <h3>Verified Records</h3>
            <div className="stat-value">{stats.verifiedRecords}</div>
          </div>
          <div className="stat-card">
            <h3>Total Donations</h3>
            <div className="stat-value">${stats.totalDonations}</div>
          </div>
          <div className="stat-card">
            <h3>Recent Activity</h3>
            <div className="stat-value">{stats.recentActivity}</div>
          </div>
        </div>

        <div className="content-section">
          <div className="section-header">
            <h2>Alumni Network</h2>
            <div className="controls">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Search alumni..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="tab-nav">
                <button 
                  className={activeTab === "all" ? "active" : ""}
                  onClick={() => setActiveTab("all")}
                >
                  All
                </button>
                <button 
                  className={activeTab === "verified" ? "active" : ""}
                  onClick={() => setActiveTab("verified")}
                >
                  Verified
                </button>
                <button 
                  className={activeTab === "recent" ? "active" : ""}
                  onClick={() => setActiveTab("recent")}
                >
                  Recent
                </button>
              </div>
              <button onClick={loadData} className="refresh-btn" disabled={isRefreshing}>
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="alumni-grid">
            {filteredAlumni.length === 0 ? (
              <div className="empty-state">
                <p>No alumni records found</p>
                <button onClick={() => setShowCreateModal(true)} className="create-btn">
                  Add First Alumni
                </button>
              </div>
            ) : (
              filteredAlumni.map((alumni) => (
                <div 
                  key={alumni.id} 
                  className={`alumni-card ${alumni.isVerified ? 'verified' : ''}`}
                  onClick={() => setSelectedAlumni(alumni)}
                >
                  <div className="card-header">
                    <h3>{alumni.name}</h3>
                    {alumni.isVerified && <span className="verified-badge">✅ Verified</span>}
                  </div>
                  <div className="card-content">
                    <p>Class of {alumni.graduationYear}</p>
                    <p>{alumni.description}</p>
                    <div className="alumni-meta">
                      <span>Donation: {alumni.isVerified ? `$${alumni.decryptedValue}` : '🔒 Encrypted'}</span>
                      <span>{new Date(alumni.timestamp * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Alumni Record</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="fhe-notice">
                <strong>FHE Protected</strong>
                <p>Donation amount will be encrypted with Zama FHE</p>
              </div>
              
              <div className="form-group">
                <label>Name *</label>
                <input 
                  type="text" 
                  value={newAlumniData.name}
                  onChange={(e) => setNewAlumniData({...newAlumniData, name: e.target.value})}
                  placeholder="Alumni name"
                />
              </div>
              
              <div className="form-group">
                <label>Graduation Year *</label>
                <input 
                  type="number" 
                  value={newAlumniData.graduationYear}
                  onChange={(e) => setNewAlumniData({...newAlumniData, graduationYear: e.target.value})}
                  placeholder="Graduation year"
                />
              </div>
              
              <div className="form-group">
                <label>Donation Amount (FHE Encrypted) *</label>
                <input 
                  type="number" 
                  value={newAlumniData.donationAmount}
                  onChange={(e) => setNewAlumniData({...newAlumniData, donationAmount: e.target.value})}
                  placeholder="Donation amount"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <input 
                  type="text" 
                  value={newAlumniData.description}
                  onChange={(e) => setNewAlumniData({...newAlumniData, description: e.target.value})}
                  placeholder="Brief description"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn">Cancel</button>
              <button 
                onClick={createAlumni} 
                disabled={creatingAlumni || isEncrypting || !newAlumniData.name || !newAlumniData.graduationYear || !newAlumniData.donationAmount}
                className="submit-btn"
              >
                {creatingAlumni || isEncrypting ? "Encrypting..." : "Create Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAlumni && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Alumni Details</h2>
              <button onClick={() => setSelectedAlumni(null)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>{selectedAlumni.name}</h3>
                <p>Class of {selectedAlumni.graduationYear}</p>
                <p>{selectedAlumni.description}</p>
                
                <div className="data-section">
                  <h4>Encrypted Donation Data</h4>
                  <div className="data-row">
                    <span>Donation Amount:</span>
                    <span>
                      {selectedAlumni.isVerified ? 
                        `$${selectedAlumni.decryptedValue} (Verified)` : 
                        '🔒 FHE Encrypted'
                      }
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => decryptData(selectedAlumni.id)}
                    disabled={isDecrypting || selectedAlumni.isVerified}
                    className={`decrypt-btn ${selectedAlumni.isVerified ? 'verified' : ''}`}
                  >
                    {isDecrypting ? 'Decrypting...' : 
                     selectedAlumni.isVerified ? '✅ Verified' : 
                     '🔓 Verify Donation'}
                  </button>
                </div>
                
                <div className="meta-info">
                  <p>Created: {new Date(selectedAlumni.timestamp * 1000).toLocaleString()}</p>
                  <p>By: {selectedAlumni.creator.substring(0, 8)}...{selectedAlumni.creator.substring(34)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {transactionStatus.visible && (
        <div className="notification">
          <div className={`notification-content ${transactionStatus.status}`}>
            {transactionStatus.status === "pending" && <div className="spinner"></div>}
            {transactionStatus.status === "success" && <span>✓</span>}
            {transactionStatus.status === "error" && <span>✗</span>}
            <span>{transactionStatus.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

