# Sistema de Processamento de Encomendas de Compras Online (@ MyGreatCompany)

Este projeto implementa um Sistema de Gestão de Encomendas (OMS) *full-stack* com um frontend moderno e um backend escalável utilizando Azure Event Hubs .

## Estrutura do Projeto

- **frontend/**: Interface de E-commerce Premium em HTML/CSS/JS (Nginx).
- **backend/**: API Node.js + Produtor/Consumidor do Event Hub.
- **infrastructure/**: 
  - `terraform/`: Infraestrutura como Código para Azure (Event Hubs).
  - `ansible/`: Automação da configuração de servidores.
- **docker-compose.yml**: Orquestração para desenvolvimento local.

## Início Rápido

### 1. Pré-requisitos
- Docker & Docker Compose
- Node.js (para desenvolvimento local)

### 2. Executar a Aplicação (Simulação Local)
Utilizamos o Docker Compose para iniciar toda a *stack* (3x Frontend, Load Balancer Traefik, Backend, Banco de Dados).

```bash
docker-compose up --build --scale frontend=3
```

- **Loja (UI)**: Abra [http://localhost](http://localhost)
- **Dashboard Traefik**: [http://localhost:8080](http://localhost:8080)


### 3. Implantação da Infraestrutura
Para implantar os recursos na nuvem:

**Terraform (Azure Event Hubs)**:
```bash
cd infrastructure/terraform
terraform init
terraform apply
```

**Ansible (Configuração do Servidor)**:
```bash
cd infrastructure/ansible
ansible-playbook -i inventory.ini playbook.yml
```

## Arquitetura
- **Traefik**: Reverse Proxy & Load Balancer.
- **Nginx**: Serve os arquivos estáticos do frontend (escalado para 3 réplicas).
- **Node.js**: 
  - **API**: Recebe as encomendas.
  - **Produtor**: Envia as encomendas para o Azure Event Hub.
  - **Consumidor**: Lê do Event Hub e salva no MySQL.
- **MySQL**: Armazenamento persistente para as encomendas.

## Integração Azure (Retenção de Dados & Compliance)
Para habilitar a integração real com o Azure Event Hub com **Retenção de Dados de 10 Anos**:

1.  **Provisionar Recursos**:
    Execute os scripts do Terraform em `infrastructure/terraform`. Isso criará:
    *   **Event Hub Namespace & Hub**: Para ingestão em tempo real.
    *   **Storage Account & Container**: Para arquivamento de longo prazo (Cold Storage).
    *   **Recurso Capture**: Transmite automaticamente os dados do Event Hub para o Blob Storage (formato Avro) a cada 5 minutos.

2.  **Configurar Backend**:
    Atualize o arquivo `backend/.env` com a `EVENTHUB_CONNECTION_STRING` gerada pelo Terraform.

##  Desenvolvimento
Para continuar a trabalhar neste projeto:
*   **VS Code**: Abra esta pasta diretamente.
*   **Docker**: Certifique-se de que o Docker Desktop está em execução para os containers da aplicação e banco de dados.
