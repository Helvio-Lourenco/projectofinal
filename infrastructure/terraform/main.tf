provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
  # subscription_id = "..." # Remova o comentário e insira o seu ID se necessário
}

resource "azurerm_resource_group" "oms_rg" {
  name     = "oms-resource-group"
  location = "northeurope"
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}


# 1. Event Hub 

resource "azurerm_eventhub_namespace" "oms_eh_ns" {
  name                = "oms-eventhub-ns-${random_string.suffix.result}"
  location            = azurerm_resource_group.oms_rg.location
  resource_group_name = azurerm_resource_group.oms_rg.name
  sku                 = "Standard"
  capacity            = 1

  tags = {
    environment = "Production"
  }
}


#  armazenamento dos 10 anos

resource "azurerm_storage_account" "oms_sa" {
  name                     = "omsstorage${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.oms_rg.name
  location                 = azurerm_resource_group.oms_rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS" # Low cost for archive

  tags = {
    purpose = "Auditing"
    retention = "10 Years"
  }
}

resource "azurerm_storage_container" "oms_arch" {
  name                  = "order-archives"
  storage_account_name  = azurerm_storage_account.oms_sa.name
  container_access_type = "private"
}


#  Event Hub with Data Capture (Archiving)

resource "azurerm_eventhub" "oms_eh" {
  name                = "orders-topic"
  namespace_name      = azurerm_eventhub_namespace.oms_eh_ns.name
  resource_group_name = azurerm_resource_group.oms_rg.name
  partition_count     = 2
  message_retention   = 1 # Real-time retention (1 day ok)

  # Capture feature enables long-term persistence to Blob Storage
  capture_description {
    enabled             = true
    encoding            = "Avro"
    interval_in_seconds = 300       # Every 5 minutes
    size_limit_in_bytes = 10485760  # Or every 10 MB
    destination {
      name                = "EventHubArchive.AzureBlockBlob"
      archive_name_format = "{Namespace}/{EventHub}/{PartitionId}/{Year}-{Month}-{Day}/{Hour}_{Minute}_{Second}"
      blob_container_name = azurerm_storage_container.oms_arch.name
      storage_account_id  = azurerm_storage_account.oms_sa.id
    }
  }
}

# Consumer Group for the Node Backend
resource "azurerm_eventhub_consumer_group" "oms_cg" {
  name                = "oms-backend-cg"
  namespace_name      = azurerm_eventhub_namespace.oms_eh_ns.name
  eventhub_name       = azurerm_eventhub.oms_eh.name
  resource_group_name = azurerm_resource_group.oms_rg.name
}

output "eventhub_connection_string" {
  value     = azurerm_eventhub_namespace.oms_eh_ns.default_primary_connection_string
  sensitive = true
}

output "eventhub_name" {
  value = azurerm_eventhub.oms_eh.name
}

output "storage_account_name" {
  value = azurerm_storage_account.oms_sa.name
}
