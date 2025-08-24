# Deployment Guide - Sei Social Tipping Agent

## Prerequisites

- Node.js 18+ installed
- Sei wallet with testnet/mainnet SEI tokens
- Social platform API keys (Twitter, Discord, LinkedIn)
- OpenAI API key for content evaluation

## Setup Instructions

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-repo/sei-social-tipping-agent.git
cd sei-social-tipping-agent

# Run setup script
npm run setup
# or
bash scripts/setup.sh
```

### 2. Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

#### Required Environment Variables:

**Sei Network Configuration:**
- `SEI_NETWORK`: Use `testnet` for Arctic-1 or `mainnet` for Pacific-1
- `SEI_PRIVATE_KEY`: Your EVM private key (with 0x prefix)
- `SEI_RPC_URL`: RPC endpoint (defaults provided)

**x402 Protocol:**
- `X402_FACILITATOR_URL`: Local facilitator URL (default: http://localhost:3001)
- `FACILITATOR_PORT`: Port for local facilitator (default: 3001)

**Social Platforms:**
- Twitter API credentials
- Discord bot token
- LinkedIn API credentials (optional)

**AI/ML:**
- `OPENAI_API_KEY`: For content quality evaluation

### 3. Start Local x402 Facilitator

The x402 facilitator handles micropayments on Sei EVM:

```bash
# Terminal 1: Start facilitator
npm run facilitator
```

This starts a local x402 facilitator on port 3001 that:
- Verifies payment signatures
- Settles payments on Sei EVM
- Supports both Arctic (testnet) and Pacific (mainnet)

### 4. Deploy Agent Contract

Deploy the agent's smart contract to Sei:

```bash
npm run deploy
```

This will:
- Connect to Sei network
- Register the agent on-chain
- Create agent NFT identity
- Output contract address and agent ID

Update your `.env` with the output values:
```
AGENT_ID=<generated_agent_id>
AGENT_CONTRACT_ADDRESS=<deployed_contract_address>
```

### 5. Test Payment System

Verify the payment system is working:

```bash
npm run test:payment
```

This will:
- Initialize x402 client
- Check wallet balance
- Send a test micropayment
- Verify transaction on Sei

### 6. Start the Agent

#### Development Mode:
```bash
npm run dev
```

#### Production Mode:
```bash
npm run build
npm start
```

## API Endpoints

Once running, the agent exposes these endpoints:

- `GET /health` - System health check
- `GET /stats` - Agent statistics and metrics
- `POST /preferences` - Update agent preferences
- `POST /tip` - Manual tip trigger (testing)

## Monitoring

### View Logs:
```bash
tail -f logs/combined.log
tail -f logs/error.log
```

### Check Agent Status:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/stats
```

## Deployment Options

### 1. Local Development
- Run all services locally
- Use Sei Arctic testnet
- Test with small amounts

### 2. Cloud Deployment (AWS/GCP)

#### Using Docker:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

#### Using PM2:
```bash
npm install -g pm2
pm2 start dist/index.js --name sei-tipping-agent
pm2 save
pm2 startup
```

### 3. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sei-tipping-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sei-tipping-agent
  template:
    metadata:
      labels:
        app: sei-tipping-agent
    spec:
      containers:
      - name: agent
        image: sei-tipping-agent:latest
        ports:
        - containerPort: 3000
        env:
        - name: SEI_NETWORK
          value: "mainnet"
        envFrom:
        - secretRef:
            name: agent-secrets
```

## Security Considerations

1. **Private Key Management:**
   - Never commit private keys
   - Use environment variables or secrets management
   - Consider hardware wallets for production

2. **API Key Security:**
   - Rotate API keys regularly
   - Use scoped permissions
   - Monitor for unusual activity

3. **Budget Controls:**
   - Set conservative daily limits
   - Implement circuit breakers
   - Monitor spending patterns

4. **Network Security:**
   - Use HTTPS for all endpoints
   - Implement rate limiting
   - Add authentication for admin endpoints

## Troubleshooting

### Common Issues:

1. **"Cannot connect to facilitator"**
   - Ensure facilitator is running: `npm run facilitator`
   - Check FACILITATOR_PORT is not in use
   - Verify firewall settings

2. **"Insufficient balance"**
   - Get testnet SEI from faucet: https://sei-faucet.com
   - Check wallet address is correct
   - Verify network selection (testnet/mainnet)

3. **"Twitter API rate limited"**
   - Reduce monitoring frequency
   - Implement caching
   - Use multiple API keys

4. **"OpenAI quota exceeded"**
   - Check OpenAI usage dashboard
   - Implement fallback evaluation
   - Cache evaluation results

## Performance Optimization

1. **Caching:**
   - Cache content evaluations
   - Cache user profiles
   - Cache transaction receipts

2. **Batch Processing:**
   - Group tips in batches
   - Aggregate platform requests
   - Bulk memory operations

3. **Resource Management:**
   - Limit concurrent operations
   - Implement connection pooling
   - Use worker threads for CPU tasks

## Monitoring & Analytics

### Metrics to Track:
- Tips sent per hour/day
- Average tip amount
- Platform distribution
- Creator engagement
- Budget utilization
- Error rates

### Recommended Tools:
- Prometheus + Grafana for metrics
- ELK Stack for logging
- Sentry for error tracking
- DataDog for APM

## Backup & Recovery

1. **Regular Backups:**
   ```bash
   # Backup agent state
   npm run backup
   
   # Restore from backup
   npm run restore <backup-file>
   ```

2. **Disaster Recovery:**
   - Keep wallet seed phrase secure
   - Backup configuration files
   - Document agent registry info
   - Store contract addresses

## Support

For issues or questions:
- GitHub Issues: [your-repo/issues]
- Discord: [your-discord]
- Documentation: [docs-link]

## License

MIT License - See LICENSE file for details